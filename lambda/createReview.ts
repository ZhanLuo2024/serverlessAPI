import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// Init DynamoDB client
const dynamoDbClient = new DynamoDBClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Request body is required" }) };
        }

        if (!event.requestContext || !event.requestContext.authorizer) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized - Missing Cognito Auth" })
            };
        }

        // decode JSON
        const { movieId, reviewId, reviewerId, content } = JSON.parse(event.body);

        // Check Required Fields
        if (!movieId || !reviewId || !reviewerId || !content) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
        }

        // Data Writing in to DynamoDB
        const params = {
            TableName: process.env.TABLE_NAME,
            Item: {
                "MovieId": { S: movieId },
                "ReviewId": { S: reviewId },
                "ReviewerId": { S: reviewerId },
                "Content": { S: content },
                "ReviewDate": { S: new Date().toISOString() } // 記錄提交時間
            }
        };

        // send item in to DB
        await dynamoDbClient.send(new PutItemCommand(params));

        // respond
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "request authorized and Review added successfully", reviewId,
                user: event.requestContext.authorizer,
            })
        };

    } catch (error) {
        console.error("Error inserting review:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
