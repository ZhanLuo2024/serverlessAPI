import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
// cognito
import { createCognito } from "../cognito/cognito";
// construct
import { MovieReviewLambda } from "../Construct/MovieReviewLambda";
import { AuthLambda } from "../Construct/auth-construct";

export class ServerlessAPIStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     *  create DynamoDB table
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
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
        this,
        "APIAuthorizer",
        {
          cognitoUserPools: [userPool],
        }
    );

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
     * API request Models（validation）
     * */
    const reviewModel = api.addModel("CreateReviewModel", {
      contentType: "application/json",
      modelName: "CreateReviewModel",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ["movieId", "content"],
        properties: {
          movieId: { type: apigateway.JsonSchemaType.STRING },
          content: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });

    const updateReviewModel = api.addModel("UpdateReviewModel", {
      contentType: "application/json",
      modelName: "UpdateReviewModel",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ["content"],
        properties: {
          content: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });

    /**
     * API Request Validator
     */
    const requestValidator = new apigateway.RequestValidator(this, "RequestValidator", {
          restApi: api,
          requestValidatorName: "ValidateReviewRequests",
          validateRequestBody: true,
          validateRequestParameters: true,
        }
    );

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
    // GET /movies/reviews/{movieId} (Request Validator)
    movieIdResource.addMethod(
        "GET",
        new apigateway.LambdaIntegration(reviewLambda.getReviewFunc)
    );


    // POST /movies/reviews (Request Model + Cognito Auth)
    reviews.addMethod(
        "POST",
        new apigateway.LambdaIntegration(reviewLambda.createReviewFunc),
        {
          authorizationType: apigateway.AuthorizationType.COGNITO,
          authorizer,
          requestModels: { "application/json": reviewModel },
          requestValidator: requestValidator,
        }
    );

    // PUT /movies/{movieId}/reviews/{reviewId} (Request Model + Cognito Auth)
    reviewIdResource.addMethod(
        "PUT",
        new apigateway.LambdaIntegration(reviewLambda.updateReviewFunc),
        {
          authorizationType: apigateway.AuthorizationType.COGNITO,
          authorizer,
          requestModels: { "application/json": updateReviewModel },
          requestValidator: requestValidator,
        }
    );

    // GET /reviews/{reviewId}/{movieId}/translation?language=code (Request Validator)
    translationResource.addMethod(
        "GET",
        new apigateway.LambdaIntegration(reviewLambda.translateReviewFunc),
        {
          requestValidator: requestValidator,
          requestParameters: {
            "method.request.path.reviewId": true,
            "method.request.path.movieId": true,
            "method.request.querystring.language": true,
          },
        }
    );

    /**
     * permission setting
     * */
    movieReviewsTable.grantReadWriteData(reviewLambda.getReviewFunc);
    movieReviewsTable.grantReadWriteData(reviewLambda.createReviewFunc);
    movieReviewsTable.grantReadWriteData(reviewLambda.updateReviewFunc);
    movieReviewsTable.grantReadWriteData(reviewLambda.translateReviewFunc);

    /**
     * auth API binding
     * */
    const auth = api.root.addResource("auth");
    auth.addResource("signup").addMethod("POST", new apigateway.LambdaIntegration(authLambda.signupFunc));
    auth.addResource("signin").addMethod("POST", new apigateway.LambdaIntegration(authLambda.signinFunc));
    auth.addResource("signout").addMethod("POST", new apigateway.LambdaIntegration(authLambda.signoutFunc));
  }
}
