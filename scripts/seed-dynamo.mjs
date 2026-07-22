/**
 * Seed tw-videos DynamoDB table with initial content.
 * Run: AWS_PROFILE=giftnest node scripts/seed-dynamo.mjs
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const db = DynamoDBDocumentClient.from(client);
const TABLE = 'tw-videos';

const videos = [
  { id: 'dQw4w9WgXcQ', title: "Claude 4 Just Changed Everything — Here's What It Can Do",       description: "Anthropic released Claude 4 and it beats GPT-4o on every benchmark.", thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', publishedAt: new Date(Date.now()-2*3600000).toISOString(),  category: 'ai-tech',    platform: 'youtube', viewCount: 142000, duration: '0:58' },
  { id: 'ScMzIvxBSi4', title: 'Startup Raises $50M in 48 Hours — The AI Business Story of 2026', description: 'A two-person AI startup just closed a $50M seed round.',                    thumbnail: 'https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg', publishedAt: new Date(Date.now()-5*3600000).toISOString(),  category: 'business',   platform: 'youtube', viewCount: 89000,  duration: '0:55' },
  { id: 'oHg5SJYRHA0', title: 'NASA Found Water on Mars — What This Really Means',               description: "NASA's Perseverance rover confirmed liquid water traces under the Martian surface.", thumbnail: 'https://img.youtube.com/vi/oHg5SJYRHA0/hqdefault.jpg', publishedAt: new Date(Date.now()-8*3600000).toISOString(),  category: 'science',    platform: 'youtube', viewCount: 310000, duration: '0:52' },
  { id: 'eBGIQ7ZuuiU', title: 'X Algorithm Change Is Silencing Millions of Accounts',            description: "X's latest algorithm update is drastically reducing reach for small accounts.", thumbnail: 'https://img.youtube.com/vi/eBGIQ7ZuuiU/hqdefault.jpg', publishedAt: new Date(Date.now()-12*3600000).toISOString(), category: 'social',     platform: 'youtube', viewCount: 55000,  duration: '0:47' },
  { id: 'M7lc1UVf-VE', title: 'This Robot Can Now Perform Surgery Better Than Doctors',           description: 'A new AI-powered surgical robot achieved 99.7% accuracy.',                  thumbnail: 'https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg', publishedAt: new Date(Date.now()-18*3600000).toISOString(), category: 'innovation', platform: 'youtube', viewCount: 220000, duration: '0:59' },
  { id: 'tntOCGkgt98', title: 'India Becomes 3rd Largest Economy — What Changed',                 description: 'India officially overtook Japan to become the 3rd largest economy in 2026.',  thumbnail: 'https://img.youtube.com/vi/tntOCGkgt98/hqdefault.jpg', publishedAt: new Date(Date.now()-24*3600000).toISOString(), category: 'world',      platform: 'youtube', viewCount: 198000, duration: '0:54' },
];

for (const v of videos) {
  await db.send(new PutCommand({ TableName: TABLE, Item: v }));
  console.log(`✓ seeded: ${v.title.slice(0, 50)}`);
}
console.log('\nDone! tw-videos table seeded.');
