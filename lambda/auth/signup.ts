import * as AWS from "aws-sdk";

const cognito = new AWS.CognitoIdentityServiceProvider();
const USER_POOL_ID = process.env.USER_POOL_ID || "";
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || "";

exports.handler = async (event: any) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { email, password } = body;

        if (!email || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing email or password" }) };
        }

        await cognito.signUp({
            ClientId: CLIENT_ID,
            Username: email,
            Password: password,
            UserAttributes: [{ Name: "email", Value: email }]
        }).promise();

        return { statusCode: 200, body: JSON.stringify({ message: "User registered successfully." }) };
    } catch (error) {
        console.error("Signup Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
