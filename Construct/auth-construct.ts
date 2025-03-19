import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";

export class AuthLambda extends Construct {
    public readonly signupFunc: lambda.Function;
    public readonly signinFunc: lambda.Function;
    public readonly signoutFunc: lambda.Function;

    constructor(scope: Construct, id: string, userPoolId: string, userPoolClientId: string) {
        super(scope, id);

        const commonFnProps = {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: "handler",
            environment: {
                USER_POOL_ID: userPoolId,
                USER_POOL_CLIENT_ID: userPoolClientId
            },
        };

        this.signupFunc = new node.NodejsFunction(this, "SignupFn", {
            ...commonFnProps,
            entry: `${__dirname}/../lambda/auth/signup.ts`,
        });

        this.signinFunc = new node.NodejsFunction(this, "SigninFn", {
            ...commonFnProps,
            entry: `${__dirname}/../lambda/auth/signin.ts`,
        });

        this.signoutFunc = new node.NodejsFunction(this, "SignoutFn", {
            ...commonFnProps,
            entry: `${__dirname}/../lambda/auth/signout.ts`,
        });
    }
}
