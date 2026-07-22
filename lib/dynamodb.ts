import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  // When running locally with env vars; on Lambda, uses IAM role automatically
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLES = {
  VIDEOS:      process.env.DYNAMODB_VIDEOS_TABLE      || 'tw-videos',
  SUBSCRIBERS: process.env.DYNAMODB_SUBSCRIBERS_TABLE || 'tw-subscribers',
};
