import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDbClient = new DynamoDBClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // read ‘movieId’ from API Gateway
    const movieId = event.pathParameters?.movieId;
    if (!movieId) {
        return { statusCode: 400, body: JSON.stringify({ error: "MovieId is required" }) };
    }

    const params = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "MovieId = :movieId",
        ExpressionAttributeValues: { ":movieId": { S: movieId } },
    };

    /**
     * search DynamoDB by movieId
     * */
    try {
        const data = await dynamoDbClient.send(new QueryCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
