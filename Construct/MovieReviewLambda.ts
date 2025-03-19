/**
 * manage all lambda function
 * */
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";

export class MovieReviewLambda extends Construct {
    public readonly getReviewFunc: lambda.Function;
    public readonly createReviewFunc: lambda.Function;
    public readonly updateReviewFunc: lambda.Function;
    public readonly translateReviewFunc: lambda.Function;

    constructor(scope: Construct, id: string, movieReviewsTableArn: string){
        super(scope, id);

        // commonSetup
        const commonFnProps = {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: "handler",
            environment: {
                MOVIE_REVIEWS_TABLE: movieReviewsTableArn,
            },
        };

        this.getReviewFunc = new node.NodejsFunction(this, "GetReviewsFn", {
            ...commonFnProps,
            entry: `${__dirname}/../lambda/getReviews.ts`,
        });

        this.createReviewFunc = new node.NodejsFunction(this, "CreateReviewFn", {
            ...commonFnProps,
            entry: `${__dirname}/../lambda/createReview.ts`,
        });

        this.updateReviewFunc = new node.NodejsFunction(this, "UpdateReviewFn", {
            ...commonFnProps,
            entry: `${__dirname}/../lambda/updateReview.ts`,
        });

        this.translateReviewFunc = new node.NodejsFunction(this, "TranslateReviewFn", {
            ...commonFnProps,
            entry: `${__dirname}/../lambda/translateReview.ts`,
        });
    }
}