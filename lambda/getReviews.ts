import * as AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();

interface APIGatewayEvent {
    pathParameters?: {
        movieId?: string;
    };
}

exports.handler = async (event: APIGatewayEvent): Promise<{ statusCode: number; body: string }> => {
    console.log("Lambda Triggered! Event:", JSON.stringify(event, null, 2));

    const movieId = event.pathParameters?.movieId;
    if (!movieId) {
        console.log("Missing movieId in path");
        return { statusCode: 400, body: JSON.stringify({ error: "Missing movieId" }) };
    }

    const tableName = process.env.MOVIE_REVIEWS_TABLE;
    if (!tableName) {
        console.error("MOVIE_REVIEWS_TABLE is not defined in environment variables");
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }

    try {
        console.log("🔍 Querying DynamoDB for MovieId:", movieId);

        // `AWS.DynamoDB.DocumentClient.QueryInput`
        const params: AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: tableName,
            KeyConditionExpression: "MovieId = :movieId",
            ExpressionAttributeValues: { ":movieId": movieId },
        };

        const result = await dynamoDB.query(params).promise();
        console.log("DynamoDB Query Success:", JSON.stringify(result.Items, null, 2));

        return { statusCode: 200, body: JSON.stringify(result.Items) };
    } catch (error) {
        console.error("DynamoDB Query Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
