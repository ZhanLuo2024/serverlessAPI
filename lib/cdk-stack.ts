import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import { createCognito } from "../cognito/cognito";
import { MovieReviewLambda } from "../Construct/MovieReviewLambda";
import { AuthLambda } from "../Construct/auth-construct";

export class ServerlessAPIStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     *  create DynamoDB table
     *  set partitionKey
     *  set sortKey
     *  */
    const movieReviewsTable = new dynamodb.Table(this, 'MovieReviews', {
      partitionKey: { name: 'MovieId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ReviewId', type: dynamodb.AttributeType.STRING },
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
     * create cognito
     * */
    const { userPool, userPoolClient } = createCognito(this);
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "APIAuthorizer", {
      cognitoUserPools: [userPool],
    });

    /**
     * create lambda function by construct
     * */
    const reviewLambda = new MovieReviewLambda(this, 'ReviewLambda', movieReviewsTable.tableArn)
    const authLambda = new AuthLambda(this, "AuthLambda", userPool.userPoolId, userPoolClient.userPoolClientId);

    /**
     * set translate permission
     * */
    reviewLambda.translateReviewFunc.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["translate:TranslateText"],
          resources: ["*"],
        })
    );

    movieReviewsTable.grantReadData(reviewLambda.translateReviewFunc);

    /**
     * create API Gateway
     * */
    const api = new apigateway.RestApi(this, 'RestApi', {
      description: 'Movie Review API',
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS
      },
    });

    /**
     * API setup
     * */
    const reviews = api.root.addResource("movies").addResource("reviews");
    const movieIdResource = reviews.addResource("{movieId}");
    const reviewIdResource = movieIdResource.addResource("{reviewId}");
    const translationResource = api.root
        .addResource("reviews")
        .addResource("{reviewId}")
        .addResource("{movieId}")
        .addResource("translation");

    /**
     * setting request method binding with lambda
     * */
    // GET /movies/reviews/{movieId}
    movieIdResource.addMethod("GET", new apigateway.LambdaIntegration(reviewLambda.getReviewFunc));

    // POST /movies/reviews
    reviews.addMethod("POST", new apigateway.LambdaIntegration(reviewLambda.createReviewFunc), {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
    });

    // PUT /movies/{movieId}/reviews/{reviewId}
    reviewIdResource.addMethod("PUT", new apigateway.LambdaIntegration(reviewLambda.updateReviewFunc), {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
    });

    // GET /reviews/{reviewId}/{movieId}/translation?language=code
    translationResource.addMethod("GET", new apigateway.LambdaIntegration(reviewLambda.translateReviewFunc));

    /**
     * permission setting
     * */
    movieReviewsTable.grantReadWriteData(reviewLambda.getReviewFunc);
    movieReviewsTable.grantReadWriteData(reviewLambda.createReviewFunc);
    movieReviewsTable.grantReadWriteData(reviewLambda.updateReviewFunc);

    /**
     * auth API binding
     * */
    const auth = api.root.addResource("auth");
    auth.addResource("signup").addMethod("POST", new apigateway.LambdaIntegration(authLambda.signupFunc));
    auth.addResource("signin").addMethod("POST", new apigateway.LambdaIntegration(authLambda.signinFunc));
    auth.addResource("signout").addMethod("POST", new apigateway.LambdaIntegration(authLambda.signoutFunc));
  }
}
