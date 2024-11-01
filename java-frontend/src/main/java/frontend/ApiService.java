package frontend;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ChallengeNameType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GlobalSignOutRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.RespondToAuthChallengeRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.RespondToAuthChallengeResponse;

public class ApiService {
    // private static final String USER_POOL_ID = "us-west-1_TTsJR3Oe6";
    // private static final int REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30;
    private static ApiService instance;
    private final CognitoIdentityProviderClient cognitoClient;
    private final String baseUrl;
    private final String clientID;
    private final String clientSecret;
    private String username;
    private String secretHash;
    private String sessionToken;
    private String idToken;
    private String refreshToken;
    private String accessToken;
    private Instant accessTokenExpiration;

    public enum AuthResponse {
        SUCCESS,
        ERROR,
        MFA_SETUP,
        SOFTWARE_TOKEN_MFA,
        NEW_PASSWORD_REQUIRED
    }

    // Private constructor to prevent instantiation
    private ApiService(String baseUrl, String clientID, String clientSecret) {
        this.baseUrl = baseUrl;
        this.clientID = clientID;
        this.clientSecret = clientSecret;
        this.cognitoClient = CognitoIdentityProviderClient.builder()
                .region(Region.US_WEST_2)
                .build();
    }

    // Public method to provide access to the singleton instance
    public static ApiService getInstance(String baseUrl, String clientID, String clientSecret) {
        if (instance == null) {
            instance = new ApiService(baseUrl, clientID, clientSecret);
        }
        return instance;
    }

    private String getSecretHash(String username) throws NoSuchAlgorithmException, InvalidKeyException {
        String message = username + clientID;
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(clientSecret.getBytes(), "HmacSHA256");
        mac.init(secretKey);
        byte[] hmacBytes = mac.doFinal(message.getBytes());
        return Base64.getEncoder().encodeToString(hmacBytes);
    }

    // Update tokens if they are present
    private void updateTokens(InitiateAuthResponse res) {
        this.sessionToken = Optional.ofNullable(res.session()).orElse(this.sessionToken);
        
        // The following lines depend on res.authenticationResult()
        if (res.authenticationResult() == null)
            return;

        this.accessTokenExpiration = res.authenticationResult().expiresIn() != null 
            ? Instant.now().plusSeconds(res.authenticationResult().expiresIn()) 
            : this.accessTokenExpiration;
        this.accessToken = Optional.ofNullable(res.authenticationResult().accessToken()).orElse(this.accessToken);
        this.refreshToken = Optional.ofNullable(res.authenticationResult().refreshToken()).orElse(this.refreshToken);
        this.idToken = Optional.ofNullable(res.authenticationResult().idToken()).orElse(this.idToken);
    }
    // AWS SDK inheritance sucks so this is easier than polymorphism
    private void updateTokens(RespondToAuthChallengeResponse res) {
        this.sessionToken = Optional.ofNullable(res.session()).orElse(this.sessionToken);
        
        // The following lines depend on res.authenticationResult()
        if (res.authenticationResult() == null)
            return;

        this.accessTokenExpiration = res.authenticationResult().expiresIn() != null 
            ? Instant.now().plusSeconds(res.authenticationResult().expiresIn()) 
            : this.accessTokenExpiration;
        this.accessToken = Optional.ofNullable(res.authenticationResult().accessToken()).orElse(this.accessToken);
        this.refreshToken = Optional.ofNullable(res.authenticationResult().refreshToken()).orElse(this.refreshToken);
        this.idToken = Optional.ofNullable(res.authenticationResult().idToken()).orElse(this.idToken);
    }

    // Log in via username/password
    public AuthResponse passwordLogin(String username, String password) throws NoSuchAlgorithmException, InvalidKeyException {
        this.username = username;
        this.secretHash = getSecretHash(username);
        try {
            InitiateAuthRequest authRequest = InitiateAuthRequest.builder()
                    .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                    .clientId(clientID)
                    .authParameters(Map.of(
                        "USERNAME", username,
                        "PASSWORD", password
                    ))
                    .build();

            InitiateAuthResponse authResponse = this.cognitoClient.initiateAuth(authRequest);
            updateTokens(authResponse);

            // No challenge = successful login
            if (authResponse.challengeName() == null) {
                return AuthResponse.SUCCESS;
            }

            // Process valid challenge types
            switch (authResponse.challengeName()) {
                case MFA_SETUP -> {
                    return AuthResponse.MFA_SETUP;
                }
                case SOFTWARE_TOKEN_MFA -> {
                    return AuthResponse.SOFTWARE_TOKEN_MFA;
                }
                case NEW_PASSWORD_REQUIRED -> {
                    return AuthResponse.NEW_PASSWORD_REQUIRED;
                }
                default -> {
                    return AuthResponse.ERROR;
                }
            }
        } catch (CognitoIdentityProviderException e) {
            System.out.println("Authentication failed with message: " + e.getMessage());
            System.out.println("Error Code: " + e.awsErrorDetails().errorCode());
            System.out.println("HTTP Status Code: " + e.statusCode());
            return AuthResponse.ERROR;
        }
    }

    // Login via MFA OTP
    public AuthResponse mfaLogin(String mfaCode) {
        try {
            RespondToAuthChallengeRequest challengeRequest = RespondToAuthChallengeRequest.builder()
                    .challengeName(ChallengeNameType.SOFTWARE_TOKEN_MFA)
                    .clientId(clientID) // Your app client ID
                    .challengeResponses(Map.of(
                            "USERNAME", this.username,
                            "SOFTWARE_TOKEN_MFA", mfaCode,
                            "SECRET_HASH", this.secretHash
                        )
                    )
                    .session(this.sessionToken)
                    .build();

            // Call Cognito to respond to the MFA challenge
            RespondToAuthChallengeResponse challengeResponse = cognitoClient.respondToAuthChallenge(challengeRequest);
            updateTokens(challengeResponse);
            return AuthResponse.SUCCESS;
        } catch (CognitoIdentityProviderException e) {
            System.out.println("Authentication failed with message: " + e.getMessage());
            System.out.println("Error Code: " + e.awsErrorDetails().errorCode());
            System.out.println("HTTP Status Code: " + e.statusCode());
            return AuthResponse.ERROR;
        }
    }

    // Logout to invalidate current tokens
    public boolean logout() {
        try {
            GlobalSignOutRequest logoutRequest = GlobalSignOutRequest.builder()
                        .accessToken(this.accessToken)
                        .build();
            cognitoClient.globalSignOut(logoutRequest);
            // clear local cache
            this.secretHash = null;
            this.idToken = null;
            this.accessToken = null;
            this.refreshToken = null;          
            return true;
        } catch (CognitoIdentityProviderException e) {
            System.out.println("Authentication failed with message: " + e.getMessage());
            System.out.println("Error Code: " + e.awsErrorDetails().errorCode());
            System.out.println("HTTP Status Code: " + e.statusCode());
            return false;
        }
    }

    // Refresh access token after expiration
    public AuthResponse refresh() throws IOException {
        try {
            RespondToAuthChallengeRequest challengeRequest = RespondToAuthChallengeRequest.builder()
                    .challengeName(ChallengeNameType.SOFTWARE_TOKEN_MFA)
                    .clientId(clientID) // Your app client ID
                    .challengeResponses(Map.of(
                            "REFRESH_TOKEN", this.refreshToken,
                            "SECRET_HASH", this.secretHash
                        )
                    )
                    .session(this.sessionToken)
                    .build();

            // Call Cognito to respond to the MFA challenge
            RespondToAuthChallengeResponse challengeResponse = cognitoClient.respondToAuthChallenge(challengeRequest);
            updateTokens(challengeResponse);
            return AuthResponse.SUCCESS;
        } catch (CognitoIdentityProviderException e) {
            System.out.println("Authentication failed with message: " + e.getMessage());
            System.out.println("Error Code: " + e.awsErrorDetails().errorCode());
            System.out.println("HTTP Status Code: " + e.statusCode());
            return AuthResponse.ERROR;
        }
    }

    // Method to get user information
    public String getCustomerInfo(String customerID) {
        // TODO: HTTP GET USER
        return "";
    }

    // Method to get user information
    public String getCustomerInfo(String firstName, String lastName, String ssn) {
        // TODO: HTTP GET USER
        return "";
    }

    // Method to upload data
    public boolean upload(String data) {
        // TODO: HTTP POST
        return false;
    }
}
