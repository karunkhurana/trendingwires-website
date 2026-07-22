#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TrendingWiresStack } from '../lib/trendingwires-stack';

const app = new cdk.App();

new TrendingWiresStack(app, 'TrendingWiresStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION || 'ap-south-1',
  },
  tags: {
    Project:     'TrendingWires',
    Environment: 'production',
  },
});
