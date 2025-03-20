/**
 * create review API
 *
 * Allow login user to submit movie reviews
 * Storing movie review in DynamoDB
 * return 201 Created
 *
 * validation
 * movieId: exist and be a non-empty string
 * content: exist and be a non-empty string
 * Only allow logged-in user to submit
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.MOVIE_REVIEWS_TABLE || "";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Check the Authorization header
        if (!event.requestContext.authorizer || !event.requestContext.authorizer.claims) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Unauthorized - Missing Token" }),
            };
        }
        const reviewerId = event.requestContext.authorizer.claims.sub; // **从 Cognito 获取用户 ID**

        // Parsing body
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing request body" }),
            };
        }

        const body = JSON.parse(event.body);
        const { movieId, content } = body;

        // Input Validation
        if (!movieId || typeof movieId !== "string" || movieId.trim() === "") {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid movieId" }) };
        }

        if (!content || typeof content !== "string" || content.trim() === "") {
            return { statusCode: 400, body: JSON.stringify({ error: "Review content cannot be empty" }) };
        }

        // generate Review ID
        const reviewId = uuidv4();

        // store in to DynamoDB
        const params = {
            TableName: TABLE_NAME,
            Item: {
                MovieId: movieId,
                ReviewId: reviewId,
                ReviewerId: reviewerId,
                Content: content,
                ReviewDate: new Date().toISOString(),
            },
        };

        await dynamoDB.put(params).promise();

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "Review added successfully",
                reviewId,
            }),
        };

    } catch (error: any) {
        console.error("Create Review Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
        };
    }
};
