import { jwtDecode } from "jwt-decode";
import crypto from 'crypto'
import ResponseType from "@/types/ResponseType";
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    AuthFlowType,
    RespondToAuthChallengeCommand,
    RespondToAuthChallengeCommandInput,
    AssociateSoftwareTokenCommand,
    AssociateSoftwareTokenCommandInput,
    VerifySoftwareTokenCommand,
    VerifySoftwareTokenCommandInput,
  } from '@aws-sdk/client-cognito-identity-provider'

// Constants (replace with actual values)
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID as string
const CLIENT_SECRET = process.env.NEXT_PUBLIC_CLIENT_SECRET as string
const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID as string
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30

class LoginService {
    private client: CognitoIdentityProviderClient
    private sessionToken: string
    constructor() {
        this.client = new CognitoIdentityProviderClient({ region: 'us-west-1' })
        this.sessionToken = ''
    }
    // Function to generate the secret hash
    private getSecretHash(username: string, clientId: string, clientSecret: string): string {
      const message = username + clientId
      const hmac = crypto.createHmac('sha256', clientSecret)
      hmac.update(message)
      const digest = hmac.digest('base64')
      return digest
    }

    public changePassword(username: string, password: string): Promise<ResponseType> {
        const params: RespondToAuthChallengeCommandInput = {
            ClientId: CLIENT_ID,
            ChallengeName: 'NEW_PASSWORD_REQUIRED',
            Session: this.sessionToken,
            ChallengeResponses: {
                USERNAME: username,
                NEW_PASSWORD: password,
                SECRET_HASH: this.getSecretHash(username, CLIENT_ID, CLIENT_SECRET) 
            }
        }
        const command = new RespondToAuthChallengeCommand(params)
        return this.client.send(command).then(response => {
            return ResponseType.SUCCESS
        }).catch(err => {
            console.error(err)
            return ResponseType.ERROR
        })
    }

    public mfaSetupInit(): Promise<string> {
        const params: AssociateSoftwareTokenCommandInput = {
            Session: this.sessionToken
        }
        const command = new AssociateSoftwareTokenCommand(params)
        return this.client.send(command).then(res => {
            this.sessionToken = res.Session!
            return res.SecretCode!
        })
    }
    public mfaSetupVerify(input: string): Promise<ResponseType> {
        const params: VerifySoftwareTokenCommandInput = {
            Session: this.sessionToken,
            UserCode: input
        }
        const command = new VerifySoftwareTokenCommand(params)
        // SUCCESS | ERROR
        return this.client.send(command).then(res => {
            this.sessionToken = res.Session!
            return ResponseType[res.Status! as keyof typeof ResponseType]
        })
    }

    public mfaChallenge(username: string, mfaCode: string): Promise<ResponseType> {
        const params: RespondToAuthChallengeCommandInput = {
            ClientId: CLIENT_ID,
            ChallengeName: 'SOFTWARE_TOKEN_MFA',
            Session: this.sessionToken,
            ChallengeResponses: {
                USERNAME: username,
                SOFTWARE_TOKEN_MFA_CODE: mfaCode,
                SECRET_HASH: this.getSecretHash(username, CLIENT_ID, CLIENT_SECRET) 
            }
        }
        const command = new RespondToAuthChallengeCommand(params)
        return this.client.send(command).then(response => {
            this.setToken('accessToken', response.AuthenticationResult!.AccessToken!, response.AuthenticationResult!.ExpiresIn!)
            this.setToken('idToken', response.AuthenticationResult!.IdToken!, response.AuthenticationResult!.ExpiresIn!)
            this.setToken('refreshToken', response.AuthenticationResult!.RefreshToken!, REFRESH_TOKEN_EXPIRY) // Default 30 day expiry
            return ResponseType.SUCCESS
        }).catch(err => {
            console.error(err)
            return ResponseType.ERROR
        })
    }

    public refresh(idToken: string, refreshToken: string): Promise<ResponseType> {
        const decodedToken: any = jwtDecode(idToken);
        const username: string = decodedToken.sub!
        const params = {
            AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
            ClientId: CLIENT_ID,
            UserPoolId: USER_POOL_ID,
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
                SECRET_HASH: this.getSecretHash(username, CLIENT_ID, CLIENT_SECRET) 
            },
        }
        const command = new InitiateAuthCommand(params)
        return this.client.send(command).then(response => {
            this.setToken('accessToken', response.AuthenticationResult!.AccessToken!, response.AuthenticationResult!.ExpiresIn!)
            this.setToken('idToken', response.AuthenticationResult!.IdToken!, REFRESH_TOKEN_EXPIRY) // keep ID token for refresh
            return ResponseType.SUCCESS
        }).catch(err => {
            console.error(err)
            return ResponseType.ERROR
        })
    }
    
    // Sign in function using Axios
    public login(username: string, password: string): Promise<ResponseType> {
        const params = {
            AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
            ClientId: CLIENT_ID,
            UserPoolId: USER_POOL_ID,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                SECRET_HASH: this.getSecretHash(username, CLIENT_ID, CLIENT_SECRET) 
            },
        }
        const command = new InitiateAuthCommand(params)
        return this.client.send(command).then(response => {
            // this whole thing should be handled in login component
            this.sessionToken = response.Session!
            if ('ChallengeName' in response) {
                return ResponseType[response.ChallengeName! as keyof typeof ResponseType]
            }
            this.setToken('accessToken', response.AuthenticationResult!.AccessToken!, response.AuthenticationResult!.ExpiresIn!)
            this.setToken('idToken', response.AuthenticationResult!.IdToken!, REFRESH_TOKEN_EXPIRY) // keep ID token for refresh
            this.setToken('refreshToken', response.AuthenticationResult!.RefreshToken!, REFRESH_TOKEN_EXPIRY) // Default 30 day expiry
            return ResponseType.SUCCESS
        }).catch(err => {
            console.error("LOGIN ERROR: " + err)
            return ResponseType.ERROR
        })
    }

    private setToken(cookieName: string, cookieValue: string, expiresIn: number) {
        const options = {
            path: '/',
            domain: undefined, // no default domain
            secure: true,
            sameSite: 'Lax'
        };
    
        let cookieString = `${encodeURIComponent(cookieName)}=${encodeURIComponent(cookieValue)}`
        cookieString += `; path=${options.path}`;
        cookieString += options.domain ? `; domain=${options.domain}` : '';
        cookieString += options.secure ? `; secure` : '';
        cookieString += options.sameSite ? `; samesite=${options.sameSite}` : '';
        cookieString += `; max-age=${expiresIn}`;
    
        document.cookie = cookieString;
    }
}

export default LoginService