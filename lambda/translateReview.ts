/**
 * translate review API
 *
 * Translating with Amazon Translate
 * Cache translation results to reduce Amazon Translate calls
 * return 200 OK
 *
 * validation
 * movieId: Must exist and be a non-empty string
 * reviewId: Must exist and be a non-empty string
 * language: Must exist
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const translate = new AWS.Translate();

const TABLE_NAME = process.env.MOVIE_REVIEWS_TABLE;
const TRANSLATION_INDEX = "TargetLanguageIndex";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!TABLE_NAME) {
            console.error("Error: MOVIE_REVIEWS_TABLE environment variable is not set.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Internal Server Error - Table not defined" }),
            };
        }

        const reviewId = event.pathParameters?.reviewId;
        const movieId = event.pathParameters?.movieId;
        const language = event.queryStringParameters?.language;

        if (!reviewId || !movieId || !language) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing movieId, reviewId or language" }),
            };
        }

        const validLanguages = ["en", "fr", "es", "de", "zh", "ja", "ko", "it", "pt", "ru"];
        if (!validLanguages.includes(language)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Unsupported language code" }),
            };
        }

        // check cache
        const cachedTranslation = await dynamoDB.query({
            TableName: TABLE_NAME,
            IndexName: TRANSLATION_INDEX,
            KeyConditionExpression: "ReviewId = :reviewId AND TargetLanguage = :language",
            ExpressionAttributeValues: {
                ":reviewId": reviewId,
                ":language": language
            }
        }).promise();

        if (cachedTranslation.Items && cachedTranslation.Items.length > 0) {
            console.log("Translation found in cache.");
            return {
                statusCode: 200,
                body: JSON.stringify({
                    reviewId,
                    movieId,
                    translatedContent: cachedTranslation.Items[0].TranslatedContent,
                    source: "cache"
                }),
            };
        }

        // get original content
        const reviewData = await dynamoDB.get({
            TableName: TABLE_NAME,
            Key: {
                MovieId: movieId,
                ReviewId: reviewId,
            },
        }).promise();

        console.log("Fetched item:", reviewData.Item);

        if (!reviewData.Item || !reviewData.Item.Content) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Review content not found" }),
            };
        }

        // call translate
        const translateResult = await translate.translateText({
            Text: reviewData.Item.Content,
            SourceLanguageCode: "en",
            TargetLanguageCode: language
        }).promise();

        // store in dynamoDB
        await dynamoDB.put({
            TableName: TABLE_NAME,
            Item: {
                MovieId: movieId,
                ReviewId: reviewId,
                TargetLanguage: language,
                TranslatedContent: translateResult.TranslatedText
            },
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                reviewId,
                movieId,
                translatedContent: translateResult.TranslatedText,
                source: "translate"
            }),
        };

    } catch (error) {
        console.error("Error translating review:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
