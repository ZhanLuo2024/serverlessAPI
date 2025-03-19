import * as AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const translate = new AWS.Translate();

interface APIGatewayEvent {
    pathParameters?: {
        movieId?: string;
        reviewId?: string;
    };
    queryStringParameters?: {
        language?: string;
    };
}

exports.handler = async (event: APIGatewayEvent): Promise<{ statusCode: number; body: string }> => {
    console.log("Lambda Triggered! Event:", JSON.stringify(event, null, 2));

    const { movieId, reviewId } = event.pathParameters || {};
    const targetLanguage = event.queryStringParameters?.language;
    if (!movieId || !reviewId || !targetLanguage) {
        console.log("Missing parameters");
        return { statusCode: 400, body: JSON.stringify({ error: "Missing movieId, reviewId, or language" }) };
    }

    const tableName = process.env.MOVIE_REVIEWS_TABLE;
    if (!tableName) {
        console.error("MOVIE_REVIEWS_TABLE is not defined");
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }

    try {
        console.log("Checking if translation exists in DynamoDB...");

        const queryParams: AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: tableName,
            IndexName: "TargetLanguageIndex",
            KeyConditionExpression: "ReviewId = :reviewId AND TargetLanguage = :targetLanguage",
            ExpressionAttributeValues: {
                ":reviewId": reviewId,
                ":targetLanguage": targetLanguage,
            },
        };

        const cachedResult = await dynamoDB.query(queryParams).promise();
        if (cachedResult.Items && cachedResult.Items.length > 0) {
            console.log("Cached translation found:", cachedResult.Items[0].TranslatedContent);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    translatedText: cachedResult.Items[0].TranslatedContent,
                    source: "cache"
                })
            };
        }

        console.log("🆕 No cached translation found, fetching original content...");

        const getParams: AWS.DynamoDB.DocumentClient.GetItemInput = {
            TableName: tableName,
            Key: {
                MovieId: reviewId,
                ReviewId: movieId,
            },
        };

        console.log("DynamoDB Querying with Params:", JSON.stringify(getParams, null, 2));

        const result = await dynamoDB.get(getParams).promise();
        if (!result.Item) {
            console.log("Review not found in DynamoDB");
            return { statusCode: 404, body: JSON.stringify({ error: "Review not found" }) };
        }

        const reviewContent = result.Item?.Content;
        if (!reviewContent) {
            console.error("Review content is missing in DynamoDB!");
            return { statusCode: 500, body: JSON.stringify({ error: "Review content missing" }) };
        }

        console.log("Translating content:", reviewContent);
        const translateParams: AWS.Translate.Types.TranslateTextRequest = {
            Text: reviewContent,
            SourceLanguageCode: "en",
            TargetLanguageCode: targetLanguage,
        };

        const translation = await translate.translateText(translateParams).promise();
        console.log("Translation Success:", translation.TranslatedText);

        // result store in to db
        const putParams: AWS.DynamoDB.DocumentClient.PutItemInput = {
            TableName: tableName,
            Item: {
                MovieId: movieId,
                ReviewId: reviewId,
                TargetLanguage: targetLanguage,
                TranslatedContent: translation.TranslatedText,
            },
        };

        await dynamoDB.put(putParams).promise();
        console.log("Translation cached in DynamoDB:", translation.TranslatedText);

        return {
            statusCode: 200,
            body: JSON.stringify({
                translatedText: translation.TranslatedText,
                source: "translate"
            })
        };
    } catch (error) {
        console.error("Translation Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
