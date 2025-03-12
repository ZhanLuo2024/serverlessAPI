import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ServerlessAPIStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     *  create DynamoDB table
     *  set partitionKey
     *  set sortKey
     *  */
    const movieReviewsTable = new dynamodb.Table(this, 'MovieReviews', {
      partitionKey: {name: 'MovieId', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'ReviewId', type: dynamodb.AttributeType.STRING},
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * create lambda function
     * GET Reviews
     **/
    const getReviewsLambda = new NodejsFunction(this, 'GetReviewsLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'lambda/getReviews.ts',
      handler: 'handler',
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
      },
    });

    /**
     * create lambda function
     * POST Create Review
     * */
    const createReviewLambda = new NodejsFunction(this, 'CreateReviewLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'lambda/createReview.ts',
      handler: 'handler',
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
      },
    });

    /**
     * Giving Lambda access to DynamoDB
     * */
    movieReviewsTable.grantReadData(getReviewsLambda);
    movieReviewsTable.grantWriteData(createReviewLambda);

    /**
     * API Gateway
     * */
    const api = new apigateway.RestApi(this, 'MovieReviewAPI', {
      restApiName: 'Movie Review Service',
    });

    /**
     * create API endpoint GET /movies/reviews/{movieId}
     * */
    const movies = api.root.addResource('movies');
    const reviews = movies.addResource('reviews');
    const movieId = reviews.addResource('{movieId}');

    // Lambda Trigger
    movieId.addMethod('GET', new apigateway.LambdaIntegration(getReviewsLambda));
    reviews.addMethod('POST', new apigateway.LambdaIntegration(createReviewLambda));
  }
}
