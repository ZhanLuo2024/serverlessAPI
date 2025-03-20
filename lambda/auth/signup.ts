/**
 * User signup API
 *
 * register new user by cognito
 * ensure 'Email' & 'pwd' are valid
 * user need verify in mail when success
 *
 * validation
 * email: Must be a valid Email format
 * pwd: At least 8 characters, including uppercase, lowercase, and numbers
 * */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const cognito = new AWS.CognitoIdentityServiceProvider();
const USER_POOL_ID = process.env.USER_POOL_ID || "";
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || "";

// Email validation
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// Password validation
const isValidPassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

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

        if (!isValidEmail(email)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid email format" }) };
        }

        if (!isValidPassword(password)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Password must be at least 8 characters, including uppercase, lowercase, and a number" }) };
        }

        await cognito.signUp({
            ClientId: CLIENT_ID,
            Username: email,
            Password: password,
            UserAttributes: [{ Name: "email", Value: email }]
        }).promise();

        return { statusCode: 201, body: JSON.stringify({ message: "User registered successfully. Please verify your email." }) };
    } catch (error: any) {
        console.error("Signup Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error", details: error.message }) };
    }
};
