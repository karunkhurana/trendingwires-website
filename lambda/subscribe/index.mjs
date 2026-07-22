/**
 * Lambda: POST /subscribe
 * Saves subscriber email to DynamoDB tw-subscribers table.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const db     = DynamoDBDocumentClient.from(client);
const TABLE  = process.env.SUBSCRIBERS_TABLE || 'tw-subscribers';

const HEADERS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }

  try {
    const body  = JSON.parse(event.body || '{}');
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid email' }) };
    }

    const existing = await db.send(new GetCommand({ TableName: TABLE, Key: { email } }));
    if (existing.Item) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ message: 'Already subscribed!' }) };
    }

    await db.send(new PutCommand({
      TableName: TABLE,
      Item: { email, subscribedAt: new Date().toISOString(), source: event.headers?.origin || 'direct' },
    }));

    return { statusCode: 201, headers: HEADERS, body: JSON.stringify({ message: 'Subscribed successfully!' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Failed to subscribe' }) };
  }
};
