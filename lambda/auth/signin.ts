import * as AWS from "aws-sdk";

const cognito = new AWS.CognitoIdentityServiceProvider();
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || "";

exports.handler = async (event: any) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { email, password } = body;

        if (!email || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing email or password" }) };
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
    } catch (error) {
        console.error("Signin Error:", error);
        return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }
};
