import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export function createCognito(stack: Construct) {
    // create User Pool
    const userPool = new cognito.UserPool(stack, "MovieReviewUserPool", {
        userPoolName: "MovieReviewUserPool",
        selfSignUpEnabled: true,
        signInAliases: { email: true },  // login by Email
        autoVerify: { email: true },  // verify Email
        passwordPolicy: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireDigits: true,
            requireSymbols: false,
        },
    });

    // create Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(stack, "MovieReviewAppClient", {
        userPool,
        userPoolClientName: "MovieReviewAppClient",
        generateSecret: false,
        authFlows: {
            userPassword: true, // Allow username and password for authentication
            adminUserPassword: true, // Allow administrator-triggered username and password authentication
        },
    });

    return { userPool, userPoolClient };
}
