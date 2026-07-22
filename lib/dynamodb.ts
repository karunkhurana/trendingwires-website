import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = process.env.APP_REGION || 'ap-south-1';

// On Amplify SSR, AWS_ prefixed vars are blocked.
// We use TW_AWS_KEY_ID / TW_AWS_SECRET instead.
const keyId  = process.env.TW_AWS_KEY_ID;
const secret = process.env.TW_AWS_SECRET;

const client = new DynamoDBClient({
  region,
  ...(keyId && secret && {
    credentials: {
      accessKeyId:     keyId,
      secretAccessKey: secret,
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
