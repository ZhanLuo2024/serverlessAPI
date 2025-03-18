import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.requestContext.authorizer || !event.requestContext.authorizer.claims) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized - Missing Token" }),
            };
        }

        // get userId
        const userId = event.requestContext.authorizer.claims.sub;

        const movieId: string = event.pathParameters?.movieId || "";
        const reviewId: string = event.pathParameters?.reviewId || "";

        if (!movieId || !reviewId) {
            console.error("Missing path parameters:", event.pathParameters);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Bad Request - Missing movieId or reviewId" }),
            };
        }

        const params = {
            TableName: TABLE_NAME,
            Key: {
                MovieId: movieId,
                ReviewId: reviewId,
            },
        };

        const { Item } = await dynamoDB.get(params).promise();

        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Review not found" }),
            };
        }

        const reviewerId = Item.ReviewerId || "Undefined";

        if (reviewerId !== userId) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: "Forbidden - You are not authorized to update this review",
                    authenticatedUser: userId,
                    reviewOwner: reviewerId || "Undefined",
                }),
            };
        }

        const body = JSON.parse(event.body || "{}");
        if (!body.content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Bad Request - Missing content in body" }),
            };
        }

        // update content
        const updateParams = {
            TableName: TABLE_NAME,
            Key: { MovieId: movieId, ReviewId: reviewId },
            UpdateExpression: "SET Content = :content",
            ExpressionAttributeValues: {
                ":content": body.content,
            },
        };

        await dynamoDB.update(updateParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Review updated successfully" }),
        };

    } catch (error) {
        console.error("Update Review Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
