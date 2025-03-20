/**
 * Get review API
 *
 * Allow all users to get the movie review list
 * return 200 OK
 *
 * validation
 * movieId: Must exist and be a non-empty string
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.MOVIE_REVIEWS_TABLE || "";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const movieId: string = event.pathParameters?.movieId || "";
        const reviewId: string | undefined = event.queryStringParameters?.reviewId;
        const reviewerName: string | undefined = event.queryStringParameters?.reviewerName;

        if (!movieId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Bad Request - Missing movieId" }),
            };
        }

        let expressionAttributeValues: AWS.DynamoDB.DocumentClient.ExpressionAttributeValueMap = {
            ":movieId": movieId,
        };

        let filterExpressions: string[] = [];

        if (reviewId) {
            filterExpressions.push("ReviewId = :reviewId");
            expressionAttributeValues[":reviewId"] = reviewId;
        }

        if (reviewerName) {
            filterExpressions.push("ReviewerId = :reviewerName");
            expressionAttributeValues[":reviewerName"] = reviewerName;
        }

        // Query parameters
        let params: AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: TABLE_NAME,
            KeyConditionExpression: "MovieId = :movieId",
            ExpressionAttributeValues: expressionAttributeValues,
        };

        if (filterExpressions.length > 0) {
            params.FilterExpression = filterExpressions.join(" AND ");
        }

        // Query DynamoDB
        const { Items } = await dynamoDB.query(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ reviews: Items }),
        };
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
