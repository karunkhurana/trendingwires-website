/**
 * Lambda: POST /subscribe
 * Only accepts requests from trendingwires.com and its Amplify preview URL.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const db     = DynamoDBDocumentClient.from(client);
const TABLE  = process.env.SUBSCRIBERS_TABLE || 'tw-subscribers';

const ALLOWED_ORIGINS = [
  'https://trendingwires.com',
  'https://www.trendingwires.com',
  'https://main.d3l1yp2dl6knj3.amplifyapp.com',
  ...(process.env.STAGE === 'dev' ? ['http://localhost:3000'] : []),
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Content-Type':                     'application/json',
    'Access-Control-Allow-Origin':       allowed,
    'Access-Control-Allow-Methods':      'POST,OPTIONS',
    'Access-Control-Allow-Headers':      'Content-Type,X-Api-Key',
    'Access-Control-Allow-Credentials':  'true',
    'Vary':                              'Origin',
  };
}

export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(origin), body: '' };
  }

  // Block explicit wrong origins
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Forbidden' }),
    };
  }

  try {
    const body  = JSON.parse(event.body || '{}');
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({ error: 'Invalid email address' }),
      };
    }

    const existing = await db.send(new GetCommand({ TableName: TABLE, Key: { email } }));
    if (existing.Item) {
      return {
        statusCode: 200,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({ message: 'Already subscribed!' }),
      };
    }

    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        email,
        subscribedAt: new Date().toISOString(),
        source: origin || 'direct',
      },
    }));

    return {
      statusCode: 201,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ message: 'Subscribed successfully!' }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Failed to subscribe. Please try again.' }),
    };
  }
};
