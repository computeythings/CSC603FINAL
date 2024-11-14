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
    id: i64,
    first_name: String,
    last_name: String,
    email: String,
    conditions: Vec<bool>,
    pending_documents: i16
}

#[derive(Debug, Serialize, Deserialize)]
struct UserPOST {
    method: String, // add, update, delete
    #[serde(default)]
    id: Option<i64>,
    #[serde(default)]
    ssn: Option<String>,
    #[serde(default)]
    first_name: Option<String>,
    #[serde(default)]
    last_name: Option<String>,
    #[serde(default)]
    email: Option<String>
}

const RDS_CERTS: &[u8] = include_bytes!("global-bundle.pem");

fn hash_ssn(input: &String) -> String {
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

async fn get_user_by_id(db_connection: &sqlx::PgPool, user_id: &i64) -> Vec<UserInfo> {
    let user_query = r#"
        SELECT id, first_name, last_name, email, conditions, pending_documents
        FROM "Customers"
        WHERE id = $1
    "#;

    let query = sqlx::query_as::<_, UserInfo>(user_query)
        .bind(user_id);
    
    query.fetch_all(db_connection)
        .await
        .expect("Database user query")
}

async fn get_user_for_customer_by_id(db_connection: &sqlx::PgPool, customer_id: &String, user_id: &i64) -> Vec<UserInfo> {
    let user_query = r#"
        SELECT u.id, u.first_name, u.last_name, u.email, u.conditions, u.pending_documents
        FROM "Customers" AS u
        JOIN "PartnerCustomers" AS pc ON u.id = pc.customer_id
        WHERE pc.partner_id = $1
            AND pc.customer_id = $2
    "#;

    let query = sqlx::query_as::<_, UserInfo>(user_query)
        .bind(customer_id)
        .bind(user_id);
    
    query.fetch_all(db_connection)
        .await
        .expect("Database user query")
}

async fn get_user_by_ssn(db_connection: &sqlx::PgPool, customer_id: &String, user: &UserPOST) -> ApiGatewayProxyResponse {
    let user_query = r#"
        SELECT u.id, u.first_name, u.last_name, u.email, u.conditions, u.pending_documents
        FROM "Customers" AS u
        JOIN "PartnerCustomers" AS pc ON u.id = pc.customer_id
        WHERE u.ssn = $2 AND u.first_name = $3 AND u.last_name = $4
            AND pc.partner_id = $1
    "#;
    let ssn_hash = hash_ssn(user.ssn.as_ref().unwrap());
    let query = sqlx::query_as::<_, UserInfo>(user_query)
        .bind(customer_id)
        .bind(ssn_hash)
        .bind(user.first_name.as_ref().unwrap())
        .bind(user.last_name.as_ref().unwrap());
    
    let users = query.fetch_all(db_connection)
        .await
        .expect("Database user query");

    match users.len() {
        0 => response(
            200, 
            json!({})
        ),
        1 => response(
            200, 
            serde_json::to_value(users[0].clone()).expect("JSON Parse user")
        ),
        // Requests should not be able to return more than a single user
        _ => response(401, json!({"message": "Unauthorized request"}))
    }
}

async fn user_get(db_connection: &sqlx::PgPool, customer_id: &String, user_id: &String) -> ApiGatewayProxyResponse {
    let uid = user_id.parse::<i64>().unwrap_or(0);
    let users = get_user_for_customer_by_id(db_connection, customer_id, &uid).await;
    
    match users.len() {
        0 => response(
            200, 
            json!({})
        ),
        1 => response(
            200, 
            serde_json::to_value(users[0].clone()).expect("JSON Parse user")
        ),
        // Requests should not be able to return more than a single user
        _ => response(401, json!({"message": "Unauthorized request"}))
    }
}

async fn user_add(db_connection: &sqlx::PgPool, customer_id: &String, user: &UserPOST) -> ApiGatewayProxyResponse {
    let user_add = r#"
        INSERT INTO "Customers" 
        (ssn, first_name, last_name, email)
        VALUES
        ($1, $2, $3, $4)
        ON CONFLICT (ssn) DO NOTHING
        RETURNING id, first_name, last_name, email, conditions, pending_documents
    "#;
    let relation_add = r#"
        INSERT INTO "PartnerCustomers"
        (partner_id, customer_id)
        VALUES
        ($1, $2)
    "#;
    let new_user = match user.id {
        Some(id) => {
            let matches = get_user_by_id(db_connection, &id).await;
            match matches.len() {
                0 => return response(503, json!({"message": "Could not create customer"})),
                1 => matches[0].clone(),
                // Requests should not be able to return more than a single user
                _ => return response(401, json!({"message": "Unauthorized request"}))
            }
        },
        None => {
            println!("HASING SSN");
            let ssn = hash_ssn(&user.ssn.as_ref().unwrap());
            println!("ADDING USER");
            match sqlx::query_as::<_, UserInfo>(user_add)
                .bind(&ssn)
                .bind(user.first_name.as_ref().unwrap())
                .bind(user.last_name.as_ref().unwrap())
                .bind(user.email.as_ref().unwrap())
                .fetch_one(db_connection)
                .await {
                    Ok(row) => row,
                    // Error caused by user existing
                    Err(e) => {
                        println!("{}", e);
                        return response(503, json!({"message": "Could not create customer"}))
                    }
                }
        }
    };
    println!("ADDING RELATION");

    match sqlx::query(relation_add)
        .bind(customer_id)
        .bind(&new_user.id)
        .execute(db_connection)
        .await {
            Ok(_) => response(200, json!( new_user )),
            Err(_) => response(503, json!({"message": "Could not add customer"}))
        }
}

async fn user_delete(db_connection: &sqlx::PgPool, customer_id: &String, user: &UserPOST) -> ApiGatewayProxyResponse {
    let user_relation_delete = r#"
        DELETE FROM "PartnerCustomers"
        WHERE partner_id = $1 AND customer_id = $2
    "#;
    let user_delete = r#"
        DELETE FROM "Customers"
        WHERE id = $1
    "#;
    // Start transaction
    match sqlx::query(user_relation_delete)
        .bind(&customer_id)
        .bind(&user.id.unwrap_or(0))
        .execute(db_connection)
        .await {
            Ok(_) => {},
            Err(e) => {
                println!("{}",e);
                return response(503, json!({"message": "Could not remove user."}));
            }
        }
    match sqlx::query(user_delete)
        .bind(&user.id)
        .execute(db_connection)
        .await {
            Ok(_) => {
                println!("Deleted user {}", &user.id.unwrap_or(0));
                response(200, json!({"message": "Success"}))
            },
            Err(e) => {
                println!("{}",e);
                return response(503, json!({"message": "Could not remove user."}));
            }
        }
}

async fn user_update(db_connection: &sqlx::PgPool, customer_id: &String, user: &UserPOST) -> ApiGatewayProxyResponse {
    let mut user_update_string = String::new();
    user_update_string.push_str("UPDATE \"Customers\" SET\n");

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
    user_update_string.push_str("AND EXISTS (SELECT 1 FROM \"PartnerCustomers\" WHERE customer_id = $1 AND partner_id = $2)");
    
    // Create query and bind key values
    let mut query = sqlx::query(user_update_string.as_str())
        .bind(&user.id)
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
    let user_info: UserPOST = match body {
        Some(b) => match serde_json::from_str(b) {
            Ok(o) => o,
            Err(e) => {
                println!("{}", e);
                return response(401, json!({"message": "Invalid data"}))
            }
        },
        None => {
            return response(401, json!({"message": "No data supplied"}))
        }
    };
    match user_info.method.as_str() {
        "get" => get_user_by_ssn(db_connection, customer_id, &user_info).await,
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
    let query_params = &event.payload.query_string_parameters;
    let req_method = event.payload.request_context.http_method;
    let caller_subject = &event.payload.request_context.authorizer.fields
        .get("claims")
        .and_then(|claims| claims.get("sub"))
        .map(|sub| sub.to_string())
        .unwrap_or("Could not identify requestor.".to_string())
        .replace("\"",""); // Filter out the quote characters pulled from the json data
    
    let id = query_params.first("id").unwrap_or("").to_string();
    match req_method {
        http::Method::GET => return Ok( user_get(&pool, caller_subject, &id).await ),
        http::Method::POST => return Ok( user_post(&pool, caller_subject, &body).await ),
        _ => println!("Unsupported method")
    }
    Ok(response(405, json!({ "message": "Method not allowed" })))
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(handler)).await
}