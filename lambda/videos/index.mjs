/**
 * Lambda: GET /videos
 * Only accepts requests from trendingwires.com and its Amplify preview URL.
 * Blocked origins get 403. CORS headers only echo allowed origins.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const db     = DynamoDBDocumentClient.from(client);
const TABLE  = process.env.VIDEOS_TABLE || 'tw-videos';

// Allowed origins — add Amplify preview URL too
const ALLOWED_ORIGINS = [
  'https://trendingwires.com',
  'https://www.trendingwires.com',
  'https://main.d3l1yp2dl6knj3.amplifyapp.com',
  // Allow localhost only in dev
  ...(process.env.STAGE === 'dev' ? ['http://localhost:3000'] : []),
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Content-Type':                     'application/json',
    'Access-Control-Allow-Origin':       allowed,
    'Access-Control-Allow-Methods':      'GET,OPTIONS',
    'Access-Control-Allow-Headers':      'Content-Type,X-Api-Key',
    'Access-Control-Allow-Credentials':  'true',
    'Vary':                              'Origin',
    'Cache-Control':                     'public, max-age=60, stale-while-revalidate=300',
  };
}

export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(origin), body: '' };
  }

  // Block requests from unknown origins (non-browser server calls have no origin — allow those too
  // since they'd need the API key anyway; block explicit wrong origins only)
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Forbidden' }),
    };
  }

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

    items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ data: items, total: items.length }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
