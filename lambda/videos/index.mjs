/**
 * Lambda: GET /videos
 * Reads from DynamoDB tw-videos table.
 * Deployed separately from Next.js for direct API Gateway usage.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const db     = DynamoDBDocumentClient.from(client);
const TABLE  = process.env.VIDEOS_TABLE || 'tw-videos';

const HEADERS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=60, stale-while-revalidate=300',
};

export const handler = async (event) => {
  const qs       = event.queryStringParameters || {};
  const category = qs.category || 'all';
  const limit    = Math.min(Number(qs.limit || 12), 50);

  try {
    let items;

    if (category === 'all') {
      const res = await db.send(new ScanCommand({ TableName: TABLE, Limit: limit }));
      items = res.Items || [];
    } else {
      const res = await db.send(new QueryCommand({
        TableName:                 TABLE,
        IndexName:                 'category-publishedAt-index',
        KeyConditionExpression:    'category = :cat',
        ExpressionAttributeValues: { ':cat': category },
        Limit:                     limit,
        ScanIndexForward:          false,
      }));
      items = res.Items || [];
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ data: items, total: items.length }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
