import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDbClient = new DynamoDBClient({});
const translateClient = new TranslateClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parsing Parameters from the API Gateway
        const reviewId = event.pathParameters?.reviewId;
        const movieId = event.pathParameters?.movieId;
        const targetLanguage = event.queryStringParameters?.language;

        // Validate required parameters
        if (!reviewId || !movieId || !targetLanguage) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing reviewId, movieId, or targetLanguage" }),
            };
        }


        // Getting Movie Reviews from DynamoDB
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: {
                "MovieId": { S: movieId },
                "ReviewId": { S: reviewId }
            }
        };

        const { Item } = await dynamoDbClient.send(new GetItemCommand(params));

        if (!Item || !Item.Content) {
            return { statusCode: 404, body: JSON.stringify({ error: "Review not found" }) };
        }

        const originalText = Item.Content.S;

        // Call AWS Translate for translation
        const translateParams = {
            Text: originalText,
            SourceLanguageCode: "en",
            TargetLanguageCode: targetLanguage
        };

        const translation = await translateClient.send(new TranslateTextCommand(translateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({
                movieId,
                reviewId,
                originalText,
                translatedText: translation.TranslatedText
            })
        };
    } catch (error) {
        console.error("Translation Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }

};
