/**
 * update review API
 *
 * Allow authenticated users to modify movie reviews
 * Only the original review author can update
 * Storing movie review in DynamoDB
 * return 200 OK
 *
 * validation
 * content: exist and be a non-empty string
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.MOVIE_REVIEWS_TABLE || "";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Check authorization head
        if (!event.requestContext.authorizer || !event.requestContext.authorizer.claims) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Unauthorized - Missing Token" }),
            };
        }
        const userId = event.requestContext.authorizer.claims.sub;

        const movieId = event.pathParameters?.movieId || "";
        const reviewId = event.pathParameters?.reviewId || "";

        // Parsing body
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing request body" }),
            };
        }

        const body = JSON.parse(event.body);
        const { content } = body;

        if (!content || content.trim() === "") {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Review content cannot be empty" }),
            };
        }

        // Check if movie reviews exist
        const getParams = {
            TableName: TABLE_NAME,
            Key: { MovieId: movieId, ReviewId: reviewId },
        };
        const { Item } = await dynamoDB.get(getParams).promise();

        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Review not found" }),
            };
        }

        // Check if the current user is the original author of the movie review
        if (Item.ReviewerId !== userId) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: "Forbidden - You are not authorized to update this review",
                }),
            };
        }

        // update review
        const updateParams = {
            TableName: TABLE_NAME,
            Key: { MovieId: movieId, ReviewId: reviewId },
            UpdateExpression: "SET Content = :content",
            ExpressionAttributeValues: {
                ":content": content,
            },
        };

        await dynamoDB.update(updateParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Review updated successfully",
                updatedContent: content,
            }),
        };

    } catch (error: any) {
        console.error("Update Review Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
        };
    }
};
