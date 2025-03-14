import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";

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
     * Added GSI to support TargetLanguage
     * */
    movieReviewsTable.addGlobalSecondaryIndex({
      indexName: "TargetLanguageIndex",
      partitionKey: { name: "ReviewId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "TargetLanguage", type: dynamodb.AttributeType.STRING }
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
     * create lambda function
     * GET Translate Review
     * */
    const translateReviewLambda = new NodejsFunction(this, 'TranslateReviewLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'lambda/translateReview.ts',
      handler: 'handler',
      environment: {
        TABLE_NAME: movieReviewsTable.tableName
      }
    });

    /**
     * Giving Lambda access to DynamoDB
     * */
    movieReviewsTable.grantReadData(getReviewsLambda);
    movieReviewsTable.grantWriteData(createReviewLambda);
    movieReviewsTable.grantReadData(translateReviewLambda);

    /**
     * Allow Lambda function access AWS Translate
     * */
    translateReviewLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"],
    }));

    /**
     * Allow translatelambda have write permission*/
    translateReviewLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ["dynamodb:PutItem"],
      resources: [movieReviewsTable.tableArn],
    }));

    /**
     * API Gateway
     */
    const api = new apigateway.RestApi(this, 'MovieReviewAPI', {
      restApiName: 'Movie Review Service',
      description: 'API for managing movie reviews'
    });

    /**
     *  API endpoint
     */

    // /movies
    const movies = api.root.addResource('movies');

    // /movies/reviews
    const reviews = movies.addResource('reviews');

    // /movies/reviews/{movieId}
    const movieId = reviews.addResource('{movieId}');

    // /movies/reviews/{movieId}/reviews
    const reviewSubPath = movieId.addResource('reviews');

    // /movies/reviews/{movieId}/reviews/{reviewId}
    const reviewId = reviewSubPath.addResource('{reviewId}');

    // /movies/reviews/{movieId}/reviews/{reviewId}/translation
    const translation = reviewId.addResource('translation');

    /**
     *   Lambda trigger
     */

    // GET /movies/reviews/{movieId}
    movieId.addMethod('GET', new apigateway.LambdaIntegration(getReviewsLambda));

    // POST /movies/reviews
    reviews.addMethod('POST', new apigateway.LambdaIntegration(createReviewLambda));

    // GET /movies/reviews/{movieId}/reviews/{reviewId}/translation
    translation.addMethod('GET', new apigateway.LambdaIntegration(translateReviewLambda));

  }
}
