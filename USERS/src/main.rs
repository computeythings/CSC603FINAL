use std::env;
use std::collections::HashMap;
use sha2::{Sha256, Digest};
use std::time::{Duration, SystemTime};
use serde_json::{json, Value};
use serde::{Serialize, Deserialize};
use sqlx::FromRow;
use sqlx::postgres::PgConnectOptions;
use http::HeaderMap;
use lambda_runtime::{service_fn, Error, LambdaEvent};
use aws_credential_types::provider::ProvideCredentials;
use aws_config::BehaviorVersion;
use aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_sigv4::{
    http_request::{sign, SignableBody, SignableRequest, SigningSettings},
    sign::v4,
};

#[derive(Clone, FromRow, Serialize, Deserialize)]
struct UserInfo {
    first_name: String,
    last_name: String,
    conditions: Vec<bool>
}

#[derive(Debug, Serialize, Deserialize)]
struct POSTBody {
    id: String,
    method: String, // Add, modify, delete
    first_name: Option<String>,
    last_name: Option<String>,
    email: Option<String>,
    documents: Option<Vec<String>> // Vector of filenames
}

const RDS_CERTS: &[u8] = include_bytes!("global-bundle.pem");

fn gen_user_id(input: &String) -> String {
    let salt = env::var("SALT").expect("SALT must be set");
    let mut c = Sha256::new();
    c.update(input.to_owned() + &salt);
    let result = c.finalize();
    format!("{:x}", result)
}

fn response(status_code: i64, data: Value) -> ApiGatewayProxyResponse {
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "application/json".parse().unwrap());
    return ApiGatewayProxyResponse {
        multi_value_headers: headers.clone(),
        is_base64_encoded: false,
        body: Some(data.to_string().into()),
        status_code: status_code,
        headers
    };
}

async fn user_get(db_connection: &sqlx::PgPool, customer_id: &String, user_id: &String) -> ApiGatewayProxyResponse {
    let user_query = r#"
        SELECT u.first_name, u.last_name, u.conditions
        FROM "Users" AS u
        JOIN "CustomerUsers" AS cu ON u.id = cu.user_id
        WHERE cu.id = $1
            AND cu.user_id = $2
    "#;

    let query = sqlx::query_as::<_, UserInfo>(user_query)
        .bind(customer_id)
        .bind(user_id);
    
    let users: Vec<UserInfo> = query
        .fetch_all(db_connection)
        .await
        .expect("Database user query");
    
    match users.len() {
        0 => response(
            200, 
            json!({ "data": { "user": {} } })
        ),
        1 => response(
            200, 
            json!({ "data": { "user": users[0].clone() } })
        ),
        // Requests should not be able to return more than a single user
        _ => response(401, json!({"message": "Unauthorized request"}))
    }
}

async fn user_add(db_connection: &sqlx::PgPool, customer_id: &String, user: &POSTBody) -> ApiGatewayProxyResponse {
    let user_add = r#"
        INSERT INTO "Users" 
        (id, first_name, last_name, email)
        VALUES
        ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
    "#;
    let relation_add = r#"
        INSERT INTO "CustomerUsers"
        (id, user_id)
        VALUES
        ($1, $2)
    "#;
    let uid = gen_user_id(&user.id);
    // Start transaction
    let mut tx = match db_connection.begin().await {
        Ok(result) => result,
        Err(_) => {
            return response(503, json!({"message": "Database is busy."}));
        }
    };

    match sqlx::query(user_add)
        .bind(&uid)
        .bind(&user.first_name.as_ref().unwrap())
        .bind(&user.last_name.as_ref().unwrap())
        .bind(&user.email.as_ref().unwrap())
        .execute(&mut *tx)
        .await {
            Ok(result) => result,
            Err(e) => {
                println!("{}",e);
                tx.rollback().await.expect("Database rollback");
                return response(503, json!({"message": "Could not add user."}));
            }
        }
        .rows_affected();

    match sqlx::query(relation_add)
        .bind(&customer_id)
        .bind(&uid)
        .execute(&mut *tx)
        .await {
            Ok(result) => result,
            Err(e) => {
                println!("{}",e);
                tx.rollback().await.expect("Database rollback");
                return response(503, json!({"message": "Could not bind user to customer."}));
            }
        };

    
    // Commit transaction
    match tx.commit().await {
        Ok(_) => response(200, json!({"message": "Success"})),
        Err(_) => response(503, json!({"message": "Could not commit transaction."}))
    }
}

async fn user_delete(db_connection: &sqlx::PgPool, customer_id: &String, user: &POSTBody) -> ApiGatewayProxyResponse {
    let user_relation_delete = r#"
        DELETE FROM "CustomerUsers"
        WHERE id = $1 AND user_id = $2
    "#;
    let user_delete = r#"
        DELETE FROM "Users"
        WHERE id = $1
        AND NOT EXISTS (SELECT 1 FROM "CustomerUsers" WHERE user_id = $1)
    "#;
    let uid = gen_user_id(&user.id);
    // Start transaction
    let mut tx = match db_connection.begin().await {
        Ok(result) => result,
        Err(_) => {
            return response(503, json!({"message": "Database is busy."}));
        }
    };

    match sqlx::query(user_relation_delete)
        .bind(&customer_id)
        .bind(&uid)
        .execute(&mut *tx)
        .await {
            Ok(result) => result,
            Err(e) => {
                println!("{}",e);
                tx.rollback().await.expect("Database rollback");
                return response(503, json!({"message": "Could not unbind user."}));
            }
        };

    match sqlx::query(user_delete)
        .bind(&uid)
        .execute(&mut *tx)
        .await {
            Ok(result) => result,
            Err(e) => {
                println!("{}",e);
                tx.rollback().await.expect("Database rollback");
                return response(503, json!({"message": "Could not delete user."}));
            }
        };

    
    // Commit transaction
    match tx.commit().await {
        Ok(_) => response(200, json!({"message": "Success"})),
        Err(_) => response(503, json!({"message": "Could not commit transaction."}))
    }
}

async fn user_update(db_connection: &sqlx::PgPool, customer_id: &String, user: &POSTBody) -> ApiGatewayProxyResponse {
    let mut user_update_string = String::new();
    user_update_string.push_str("UPDATE \"Users\" SET\n");
    let uid = gen_user_id(&user.id);

    // Determine what to update
    let mut update_values = HashMap::<&str, String>::new();
    user.first_name.as_ref().map(|s| update_values.insert("first_name", s.to_string()));
    user.last_name.as_ref().map(|s| update_values.insert("last_name", s.to_string()));
    user.email.as_ref().map(|s| update_values.insert("email", s.to_string()));
    // No need to query if there's nothing to update
    if update_values.len() < 1 {
        return response(200, json!({"message": "Success"}));
    }
    // Insert keys to update
    let mut i = 1;
    for (key, _) in &update_values {
        // Start index at i+2 to account for user id and customer id indexes
        user_update_string.push_str(format!("{} = ${}", key, i+2).as_str());
        if i < update_values.len() {
            user_update_string.push(',');
        }
        user_update_string.push('\n');
        i+=1;
    }

    user_update_string.push_str("WHERE id = $1\n");
    user_update_string.push_str("AND EXISTS (SELECT 1 FROM \"CustomerUsers\" WHERE user_id = $1 AND id = $2)");
    
    // Create query and bind key values
    let mut query = sqlx::query(&user_update_string.as_str())
        .bind(&uid)
        .bind(&customer_id);
    for (_, value) in &update_values {
        query = query.bind(value.as_str());
    }
    // Run update
    match query.execute(db_connection)
        .await {
            Ok(_) => response(200, json!({"message": "Success"})),
            Err(e) => {
                println!("{}", e);
                response(503, json!({"message": "Could not update user."}))
            }
        }
}

async fn user_post(db_connection: &sqlx::PgPool, customer_id: &String, body: &Option<String>) -> ApiGatewayProxyResponse {
    // TODO: process body
    let user_info: POSTBody = match body {
        Some(b) => match serde_json::from_str(b) {
            Ok(o) => o,
            Err(_) => {
                return response(401, json!({"message": "Invalid data"}))
            }
        },
        None => {
            return response(401, json!({"message": "No data supplied"}))
        }
    };
    match user_info.method.as_str() {
        "add" => user_add(db_connection, customer_id, &user_info).await,
        "update" => user_update(db_connection, customer_id, &user_info).await,
        "delete" => user_delete(db_connection, customer_id, &user_info).await,
        _ => response(405, json!({ "message": "Unsupported method" }))
    }
    
}

async fn generate_rds_iam_token(
    db_hostname: &str,
    port: u16,
    db_username: &str,
) -> Result<String, Error> {
    let config = aws_config::load_defaults(BehaviorVersion::v2024_03_28()).await;
    let credentials = config
        .credentials_provider()
        .expect("Credential provider provisioning")
        .provide_credentials()
        .await
        .expect("Load credentials");
    let identity = credentials.into();
    let region = config.region().unwrap().to_string();

    let mut signing_settings = SigningSettings::default();
    signing_settings.expires_in = Some(Duration::from_secs(900));
    signing_settings.signature_location = aws_sigv4::http_request::SignatureLocation::QueryParams;

    let signing_params = v4::SigningParams::builder()
        .identity(&identity)
        .region(&region)
        .name("rds-db")
        .time(SystemTime::now())
        .settings(signing_settings)
        .build()?;

    let url = format!(
        "https://{db_hostname}:{port}/?Action=connect&DBUser={db_user}",
        db_hostname = db_hostname,
        port = port,
        db_user = db_username
    );

    let signable_request =
        SignableRequest::new("GET", &url, std::iter::empty(), SignableBody::Bytes(&[]))
            .expect("signable request");

    let (signing_instructions, _signature) =
        sign(signable_request, &signing_params.into())?.into_parts();

    let mut url = url::Url::parse(&url).unwrap();
    for (name, value) in signing_instructions.params() {
        url.query_pairs_mut().append_pair(name, &value);
    }

    let response = url.to_string().split_off("https://".len());

    Ok(response)
}

async fn handler(event: LambdaEvent<ApiGatewayProxyRequest>) 
                    -> Result<ApiGatewayProxyResponse, Error> {
    // Read env variables
    let db_host = env::var("DB_HOSTNAME").expect("DB_HOSTNAME must be set");
    let db_port = env::var("DB_PORT")
        .expect("DB_PORT must be set")
        .parse::<u16>()
        .expect("PORT must be a valid number");
    let db_name = env::var("DB_NAME").expect("DB_NAME must be set");
    let db_username = env::var("DB_USERNAME").expect("DB_USERNAME must be set");
    
    // Generate IAM token for RDS connection
    let token = generate_rds_iam_token(&db_host, db_port, &db_username)
        .await
        .expect("TOKEN generation");

    // Connect to RDS Postgres DB
    let opts = PgConnectOptions::new()
        .host(&db_host)
        .port(db_port)
        .username(&db_username)
        .password(&token)
        .database(&db_name)
        .ssl_root_cert_from_pem(RDS_CERTS.to_vec())
        .ssl_mode(sqlx::postgres::PgSslMode::Require);

    let pool = sqlx::postgres::PgPoolOptions::new()
        .connect_with(opts)
        .await
        .expect("PGPOOL CONNECT");

    // Read API Gateway data
    let body = &event.payload.body;
    let user_query = &event.payload.query_string_parameters;
    let req_method = event.payload.request_context.http_method;
    let customer_sub = &event.payload.request_context.authorizer.fields
        .get("claims")
        .and_then(|claims| claims.get("sub"))
        .map(|sub| sub.to_string())
        .unwrap_or("Could not identify requestor.".to_string())
        .replace("\"",""); // Filter out the quote characters pulled from the json data
    
    let id = user_query.first("id").unwrap_or("").to_string();
    match req_method {
        http::Method::GET => return Ok( user_get(&pool, customer_sub, &gen_user_id(&id)).await ),
        http::Method::POST => return Ok( user_post(&pool, customer_sub, &body).await ),
        _ => println!("Unsupported method")
    }
    Ok(response(405, json!({ "message": "Method not allowed" })))
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(handler)).await
}