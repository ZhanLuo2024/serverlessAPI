import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

// Init DynamoDB client
const dynamoDbClient = new DynamoDBClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Request body is required" }) };
        }

        if (!event.requestContext || !event.requestContext.authorizer || !event.requestContext.authorizer.claims) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Unauthorized - Missing Cognito Auth" })
            };
        }

        // get `reviewerId`
        const claims = event.requestContext.authorizer.claims;
        const reviewerId = claims.sub || claims.email;  // `sub` 是 Cognito ID，`email` 是用戶郵箱
        if (!reviewerId) {
            return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized - Unable to extract user ID" }) };
        }

        const { movieId, content } = JSON.parse(event.body);

        if (!movieId || !content) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing movieId or content" }) };
        }

        const tableName = process.env.MOVIE_REVIEWS_TABLE;

        if (!tableName) {
            return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error - Table not defined" }) };
        }

        const reviewId = uuidv4();

        console.log("Checking if this reviewer has already reviewed this movie...");

        // Check if the user has commented on this
        const getParams = {
            TableName: tableName,
            Key: {
                "MovieId": { S: movieId },
                "ReviewId": { S: reviewerId },
            }
        };

        const existingReview = await dynamoDbClient.send(new GetItemCommand(getParams));
        if (existingReview.Item) {
            console.log("This reviewer already reviewed this movie, returning conflict.");
            return { statusCode: 409, body: JSON.stringify({ error: "Reviewer has already reviewed this movie" }) };
        }

        console.log("Review does not exist, proceeding with creation...");

        const putParams = {
            TableName: tableName,
            Item: {
                "MovieId": { S: movieId },
                "ReviewId": { S: reviewId },
                "ReviewerId": { S: reviewerId },
                "Content": { S: content },
                "ReviewDate": { S: new Date().toISOString() }
            }
        };

        await dynamoDbClient.send(new PutItemCommand(putParams));

        console.log("Review successfully stored in DynamoDB");

        // return 201
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "Review added successfully",
                reviewId: reviewId,
                source: "new"
            })
        };

    } catch (error) {
        console.error("Error inserting review:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
