/**
 * User signin API
 *
 * Allow signin by Email + pwd
 * Authentication using AWS Cognito
 * return idToken, accessToken, refreshToken when success
 * fail return 401 Unauthorized
 *
 * validation
 * email: must be Email format
 * password: Cannot be null
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const cognito = new AWS.CognitoIdentityServiceProvider();
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || "";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing request body" }) };
        }

        const body = JSON.parse(event.body);
        const { email, password } = body;

        if (!email || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: "Email and password are required" }) };
        }

        const response = await cognito.initiateAuth({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: CLIENT_ID,
            AuthParameters: { USERNAME: email, PASSWORD: password }
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                idToken: response.AuthenticationResult?.IdToken,
                accessToken: response.AuthenticationResult?.AccessToken,
                refreshToken: response.AuthenticationResult?.RefreshToken
            })
        };
    } catch (error: any) {
        console.error("Signin Error:", error);
        return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized - Invalid credentials", details: error.message }) };
    }
};
