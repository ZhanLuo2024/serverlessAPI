import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log("Received event:", JSON.stringify(event, null, 2));

        const tokenHeader = event.headers.Authorization || event.headers.authorization;
        if (!tokenHeader || !tokenHeader.startsWith("Bearer ")) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing accessToken" }),
            };
        }

        const accessToken = tokenHeader.split(" ")[1];

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
                body: JSON.stringify({ error: "Missing refreshToken" }),
            };
        }

        await cognito.revokeToken({
            Token: refreshToken,
            ClientId: process.env.USER_POOL_CLIENT_ID || "", // 确保环境变量正确配置
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User successfully signed out" }),
        };
    } catch (error) {
        console.error("Error during signout:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
