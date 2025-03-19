import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.MOVIE_REVIEWS_TABLE || "";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // check Cognito Token
        if (!event.requestContext.authorizer || !event.requestContext.authorizer.claims) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Unauthorized - Missing Token" }),
            };
        }

        // Cognito Token
        const userId = event.requestContext.authorizer.claims.sub;

        // movieId & reviewId
        const movieId: string = event.pathParameters?.movieId || "";
        const reviewId: string = event.pathParameters?.reviewId || "";

        if (!movieId || !reviewId) {
            console.error("Missing path parameters:", event.pathParameters);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Bad Request - Missing movieId or reviewId" }),
            };
        }

        console.log("🔍 Checking if review exists in DynamoDB...");

        // Check if the comment exists
        const params = {
            TableName: TABLE_NAME,
            Key: {
                MovieId: movieId,
                ReviewId: reviewId,
            },
        };

        const { Item } = await dynamoDB.get(params).promise();

        if (!Item) {
            console.log("Review not found.");
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Review not found" }),
            };
        }

        console.log("✅ Review found:", JSON.stringify(Item, null, 2));

        const reviewerId = Item.ReviewerId || "Undefined";
        if (reviewerId !== userId) {
            console.log("User is not authorized to update this review.");
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: "Forbidden - You are not authorized to update this review",
                    authenticatedUser: userId,
                    reviewOwner: reviewerId,
                }),
            };
        }

        // Parsing Requests
        const body = JSON.parse(event.body || "{}");

        if (!body.content || body.content.trim() === "") {
            console.log("Missing content in request body.");
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Bad Request - Missing content in body" }),
            };
        }

        console.log("Updating review content...");

        // update DynamoDB
        const updateParams = {
            TableName: TABLE_NAME,
            Key: { MovieId: movieId, ReviewId: reviewId },
            UpdateExpression: "SET Content = :content",
            ExpressionAttributeValues: {
                ":content": body.content.trim(),
            },
            ReturnValues: "UPDATED_NEW",
        };

        const updateResult = await dynamoDB.update(updateParams).promise();

        console.log("Review updated successfully:", JSON.stringify(updateResult, null, 2));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Review updated successfully",
                updatedContent: body.content.trim(),
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
