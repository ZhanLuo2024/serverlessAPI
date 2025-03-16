import { DynamoDBClient, UpdateItemCommand, GetItemCommand, ReturnValue } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";


const dynamoDbClient = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME || "";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parsing
        const reviewId = event.pathParameters?.reviewId;
        const movieId = event.pathParameters?.movieId;
        const body = event.body ? JSON.parse(event.body) : null;
        const updatedContent = body.content;

        // Parameters check
        if (!reviewId || !movieId || !body?.content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing reviewId, movieId, or content" }),
            };
        }

        // Check if the comment exists first
        const getParams = {
            TableName: TABLE_NAME,
            Key: {
                "MovieId": { S: movieId },
                "ReviewId": { S: reviewId }
            }
        };

        const getResult = await dynamoDbClient.send(new GetItemCommand(getParams));

        if (!getResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Review not found" }),
            };
        }

        // update DynamoDB review content
        const updateParams = {
            TableName: TABLE_NAME,
            Key: {
                "MovieId": { S: movieId },
                "ReviewId": { S: reviewId }
            },
            UpdateExpression: "SET Content = :content, ReviewDate = :date",
            ExpressionAttributeValues: {
                ":content": { S: updatedContent },
                ":date": { S: new Date().toISOString() }
            },
            ReturnValues: ReturnValue.UPDATED_NEW
        };

        await dynamoDbClient.send(new UpdateItemCommand(updateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Review updated successfully",
                movieId,
                reviewId,
                updatedContent: body.content
            }),
        };

    } catch (error) {
        console.error("Update Review Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
