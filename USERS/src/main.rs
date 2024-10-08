use std::env;
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

struct UserUpload {
    first_name: String,
    last_name: String,
    email: String,
    documents: Vec<String>, // Vector of filenames
    conditions: Vec<bool>
}

const RDS_CERTS: &[u8] = include_bytes!("global-bundle.pem");

fn response(status_code: i64, data: Value) -> ApiGatewayProxyResponse{
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "application/json".parse().unwrap());
    return ApiGatewayProxyResponse {
        multi_value_headers: headers.clone(),
        is_base64_encoded: false,
        // body: Some(json!({"message": message}).to_string().into()),
        body: Some(data.to_string().into()),
        status_code: status_code,
        headers
    };
}

async fn user_get(db_connection: &sqlx::PgPool, customer_id: &String, user_id: &String) -> ApiGatewayProxyResponse {
    let userdata = r#"
        SELECT u.first_name, u.last_name, u.conditions
        FROM "Users" AS u
        JOIN "CustomerUsers" AS cu ON u.id = cu.user_id
        WHERE cu.id = $1
            AND cu.user_id = $2
    "#;

    let query = sqlx::query_as::<_, UserInfo>(userdata)
        .bind(customer_id)
        .bind(user_id);
    
    let users: Vec<UserInfo> = query
        .fetch_all(db_connection)
        .await
        .expect("Database user query");

    println!("Found {} users", users.len());
    
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
        http::Method::GET => return Ok( user_get(&pool, customer_sub, &id).await ),
        http::Method::PUT => println!("PUT"),
        http::Method::PATCH => println!("PACTH"),
        http::Method::DELETE => println!("DELETE"),
        _ => println!("Unsupported method")
    }
    Ok(response(200, json!({ "message": "Success" })))
    // TEST LOCATION
    // let mut message: String = String::new();
    // let id = match user_query.first("id") {
    //     Some(istr) => istr,
    //     None => ""
    // }.to_string();
    // if id.is_empty() {
    //     return Ok(response(400, "Could not identify query ID."));
    // }
    // message.push_str(&format!("\nQuery ID is: {}", id));
    // message.push_str(&format!("\nCustomer ID: {}", customer_sub.to_string())); 
    // message.push_str("\rRequest method: ");
    // message.push_str(&req_method.as_str());
    // TEST LOCATION
    // match user_get(&pool, customer_sub, &id).await {
    //     Some(user) => message.push_str(&format!("\nfirst_name: {}\nlast_name: {}", user.first_name, user.last_name)),
    //     None => message.push_str(&format!("\nNo matching user found"))
    // }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(handler)).await
}