package frontend;

import java.io.FileInputStream;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ApiServiceTest {
    private static final Properties props = new Properties();
    private ApiService apiService;

    static {
        try (FileInputStream input = new FileInputStream("config-test.properties")) {
            props.load(input);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @BeforeEach
    void setUp() {
        // Use reflection to set up the singleton instance with a test base URL
        apiService = ApiService.getInstance(
            props.getProperty("APP_URL_BASE"), 
            props.getProperty("CLIENT_ID"), 
            props.getProperty("CLIENT_SECRET")
        );
    }

    @Test
    void testPasswordLoginFailure() throws NoSuchAlgorithmException, InvalidKeyException {
        // Test login with invalid credentials
        ApiService.AuthResponse response = apiService.passwordLogin("invaliduser", "wrongpassword");
        
        assertEquals(ApiService.AuthResponse.ERROR, response);
    }

    @Test
    void testLogout() {
        // Simulate having an access token before logout
        // This would require some setup to mock the Cognito client behavior
        boolean logoutResult = apiService.logout();
        
        // Verify logout attempt
        assertFalse(logoutResult);
    }

    @Test
    void testSingletonInstance() {
        ApiService firstInstance = ApiService.getInstance(
            props.getProperty("APP_URL_BASE"), 
            props.getProperty("CLIENT_ID"), 
            props.getProperty("CLIENT_SECRET")
        );
        ApiService secondInstance = ApiService.getInstance(
            props.getProperty("APP_URL_BASE"), 
            props.getProperty("CLIENT_ID") + "AdditionalSecretInfo", 
            props.getProperty("CLIENT_SECRET")
        );
        
        // Verify that the same instance is returned regardless of base URL
        assertSame(firstInstance, secondInstance);
    }

    @Test
    void testGetCustomerInfoUnimplemented() {
        // Test for unimplemented methods
        String customerInfo = apiService.getCustomerInfo("12345");
        assertEquals("", customerInfo);
    }

    @Test
    void testUploadUnimplemented() {
        // Test for unimplemented upload method
        boolean uploadResult = apiService.upload("test data");
        assertFalse(uploadResult);
    }
}