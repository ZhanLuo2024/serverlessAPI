import {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    PutItemCommandInput
} from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDbClient = new DynamoDBClient({});
const translateClient = new TranslateClient({});
const TABLE_NAME = process.env.TABLE_NAME || "";
const INDEX_NAME = "TargetLanguageIndex";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parse API Gateway Request Parameters
        const reviewId = event.pathParameters?.reviewId;
        const movieId = event.pathParameters?.movieId;
        const targetLanguage = event.queryStringParameters?.language;

        // Validation Parameters
        if (!reviewId || !movieId || !targetLanguage) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing reviewId, movieId, or targetLanguage" }),
            };
        }

        // Query the DynamoDB cache to see if the translation result already exists
        const cacheParams = {
            TableName: TABLE_NAME,
            IndexName: INDEX_NAME,
            KeyConditionExpression: "ReviewId = :r AND TargetLanguage = :t",
            ExpressionAttributeValues: {
                ":r": { S: reviewId },
                ":t": { S: targetLanguage }
            }
        };

        const cacheResult = await dynamoDbClient.send(new QueryCommand(cacheParams));

        if (cacheResult.Items?.length && cacheResult.Items.length > 0) {
            const cachedItem = cacheResult.Items[0];
            return {
                statusCode: 200,
                body: JSON.stringify({
                    movieId,
                    reviewId,
                    targetLanguage,
                    originalText: cachedItem?.OriginalContent?.S ?? "N/A",
                    translatedText: cachedItem?.TranslatedText?.S ?? "N/A"
                })
            };
        }

        // If there is no cache, then query the original comment.
        const getOriginalParams = {
            TableName: TABLE_NAME,
            Key: {
                "MovieId": { S: movieId },
                "ReviewId": { S: reviewId }
            }
        };

        const originalItem = await dynamoDbClient.send(new GetItemCommand(getOriginalParams));

        if (!originalItem.Item || !originalItem.Item.Content || !originalItem.Item.Content.S) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Review not found" })
            };
        }

        const originalText = originalItem.Item.Content.S;

        // Call AWS Translate for translation
        const translateParams = {
            Text: originalText,
            SourceLanguageCode: "en",
            TargetLanguageCode: targetLanguage
        };

        const translation = await translateClient.send(new TranslateTextCommand(translateParams));
        const translatedText = translation.TranslatedText;

        // Storing translation results into DynamoDB as a cache
        const putParams: PutItemCommandInput = {
            TableName: TABLE_NAME,
            Item: {
                "MovieId": { S: movieId },
                "ReviewId": { S: reviewId },
                "TargetLanguage": { S: targetLanguage },
                "TranslatedText": { S: translatedText ?? "N/A" },
                "OriginalContent": { S: originalText ?? "N/A" }
            }
        };


        await dynamoDbClient.send(new PutItemCommand(putParams));

        // return result
        return {
            statusCode: 200,
            body: JSON.stringify({
                movieId,
                reviewId,
                targetLanguage,
                originalText,
                translatedText
            })
        };
    } catch (error: any) {
        console.error("Translation Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error", details: error.message }) };
    }
};
