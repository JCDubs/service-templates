import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiConstruct } from './constructs/api-construct';
import { DatabaseConstruct } from './constructs/database-construct';
import { AuthConstruct } from './constructs/auth-construct';
import { MonitoringConstruct } from './constructs/monitoring-construct';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the database construct
    const database = new DatabaseConstruct(this, 'ProductDatabase');

    // Create the authentication construct
    const auth = new AuthConstruct(this, 'ProductAuth');

    // Create the API construct
    const api = new ApiConstruct(this, 'ProductApi', {
      productTable: database.productTable,
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient
    });

    // Create the monitoring construct
    new MonitoringConstruct(this, 'ProductMonitoring', {
      api: api.apiGateway,
      lambdaFunctions: api.lambdaFunctions,
      productTable: database.productTable
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.apiGateway.url || '',
      description: 'API Gateway endpoint URL'
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: auth.userPool.userPoolId,
      description: 'Cognito User Pool ID'
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID'
    });
  }
}
