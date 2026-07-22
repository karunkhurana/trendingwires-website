import * as cdk  from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda   from 'aws-cdk-lib/aws-lambda';
import * as apigw    from 'aws-cdk-lib/aws-apigateway';
import * as amplify  from 'aws-cdk-lib/aws-amplify';
import * as iam      from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class TrendingWiresStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── DynamoDB: Videos ──────────────────────────────────────────────────────
    // Tables were created in a prior partial deploy — import them
    const videosTable = dynamodb.Table.fromTableAttributes(this, 'VideosTable', {
      tableArn:      `arn:aws:dynamodb:${this.region}:${this.account}:table/tw-videos`,
      globalIndexes: ['category-publishedAt-index'],
    });

    // ── DynamoDB: Subscribers ─────────────────────────────────────────────────
    const subscribersTable = dynamodb.Table.fromTableAttributes(this, 'SubscribersTable', {
      tableArn: `arn:aws:dynamodb:${this.region}:${this.account}:table/tw-subscribers`,
    });

    // ── Lambda: Videos ────────────────────────────────────────────────────────
    const videosLambda = new lambda.Function(this, 'VideosFunction', {
      functionName: 'tw-videos-api',
      runtime:      lambda.Runtime.NODEJS_20_X,
      handler:      'index.handler',
      code:         lambda.Code.fromAsset(path.join(__dirname, '../../lambda/videos')),
      environment: {
        VIDEOS_TABLE: videosTable.tableName,
      },
      timeout:     cdk.Duration.seconds(10),
      memorySize:  256,
    });
    videosTable.grantReadData(videosLambda);

    // ── Lambda: Subscribe ─────────────────────────────────────────────────────
    const subscribeLambda = new lambda.Function(this, 'SubscribeFunction', {
      functionName: 'tw-subscribe-api',
      runtime:      lambda.Runtime.NODEJS_20_X,
      handler:      'index.handler',
      code:         lambda.Code.fromAsset(path.join(__dirname, '../../lambda/subscribe')),
      environment: {
        SUBSCRIBERS_TABLE: subscribersTable.tableName,
      },
      timeout:     cdk.Duration.seconds(10),
      memorySize:  128,
    });
    subscribersTable.grantReadWriteData(subscribeLambda);

    // ── API Gateway ───────────────────────────────────────────────────────────
    const api = new apigw.RestApi(this, 'TrendingWiresApi', {
      restApiName: 'trendingwires-api',
      description: 'TrendingWires REST API',
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'https://trendingwires.com',
          'https://www.trendingwires.com',
          'https://main.d3l1yp2dl6knj3.amplifyapp.com',
        ],
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Api-Key'],
        allowCredentials: true,
      },
      deployOptions: {
        stageName:           'prod',
        cachingEnabled:      false,  // disabled — query params not keyed properly with cache
        cacheClusterEnabled: false,
      },
    });

    const videosResource    = api.root.addResource('videos');
    const subscribeResource = api.root.addResource('subscribe');

    // Videos GET — include query params in cache key so each category is cached separately
    videosResource.addMethod('GET', new apigw.LambdaIntegration(videosLambda, { proxy: true }), {
      requestParameters: {
        'method.request.querystring.category': false,
        'method.request.querystring.limit':    false,
      },
      methodResponses: [{ statusCode: '200' }],
    });

    subscribeResource.addMethod('POST', new apigw.LambdaIntegration(subscribeLambda, { proxy: true }));

    // ── Amplify Hosting ───────────────────────────────────────────────────────
    const amplifyRole = new iam.Role(this, 'AmplifyRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
      ],
    });

    const amplifyApp = new amplify.CfnApp(this, 'AmplifyApp', {
      name:      'trendingwires',
      iamServiceRole: amplifyRole.roleArn,
      buildSpec: JSON.stringify({
        version: 1,
        frontend: {
          phases: {
            preBuild:  { commands: ['npm ci'] },
            build:     { commands: ['npm run build'] },
          },
          artifacts: {
            baseDirectory: '.next',
            files:         ['**/*'],
          },
          cache: { paths: ['node_modules/**/*', '.next/cache/**/*'] },
        },
      }),
      environmentVariables: [
        { name: 'NEXT_PUBLIC_API_URL',            value: api.url },
        { name: 'DYNAMODB_VIDEOS_TABLE',          value: videosTable.tableName },
        { name: 'DYNAMODB_SUBSCRIBERS_TABLE',     value: subscribersTable.tableName },
        { name: 'APP_REGION',                     value: this.region },
      ],
      customRules: [
        // SPA routing fallback
        { source: '/<*>', target: '/index.html', status: '404-200' },
      ],
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value:       api.url,
      description: 'API Gateway URL',
    });
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value:       amplifyApp.attrAppId,
      description: 'Amplify App ID',
    });
    new cdk.CfnOutput(this, 'VideosTableName', {
      value:       videosTable.tableName,
      description: 'DynamoDB Videos table',
    });
    new cdk.CfnOutput(this, 'SubscribersTableName', {
      value:       subscribersTable.tableName,
      description: 'DynamoDB Subscribers table',
    });
  }
}
