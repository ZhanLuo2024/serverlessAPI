/**
 * User signout API
 *
 * Allow user signout
 * Invalidate Access Tokens Using AWS Cognito
 * success 200
 * fail 400 Bad Request or 500 Internal Server Error
 *
 * validation
 * Authorization Header: Must contain accessToken
 * refreshToken: Must have value
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log("Received event:", JSON.stringify(event, null, 2));

        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing or invalid Authorization header" }),
            };
        }
        const accessToken = authHeader.split(" ")[1];

        // get Refresh Token
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing request body" }),
            };
        }
        const body = JSON.parse(event.body);
        const refreshToken = body.refreshToken;

        if (!refreshToken) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing refreshToken in request body" }),
            };
        }

        console.log("Access Token:", accessToken);
        console.log("Refresh Token:", refreshToken);

        // let accessToken invalid
        await cognito.globalSignOut({ AccessToken: accessToken }).promise();
        console.log("User signed out globally");

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User signed out successfully" }),
        };

    } catch (error: any) {
        console.error("Signout Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message }) };
    }
};
