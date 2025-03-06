import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejsLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { LambdaFunctionReference } from '../types';

/**
 * Props for the ApiConstruct
 */
export interface ApiConstructProps {
  /**
   * The DynamoDB table for products
   */
  productTable: dynamodb.Table;

  /**
   * The Cognito User Pool
   */
  userPool: cognito.UserPool;

  /**
   * The Cognito User Pool Client
   */
  userPoolClient: cognito.UserPoolClient;
}

/**
 * Construct for the API Gateway and Lambda functions
 */
export class ApiConstruct extends Construct {
  /**
   * The API Gateway
   */
  public readonly apiGateway: apigateway.RestApi;

  /**
   * The Lambda functions
   */
  public readonly lambdaFunctions: LambdaFunctionReference[];

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    // Create the API Gateway
    this.apiGateway = new apigateway.RestApi(this, 'ProductApi', {
      restApiName: 'Product Service',
      description: 'API for managing products',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowCredentials: true
      },
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      }
    });

    // Create the Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ProductApiAuthorizer', {
      cognitoUserPools: [props.userPool]
    });

    this.lambdaFunctions = [];

    // Create the Lambda functions
    const createProductFunction = this.createLambdaFunction(
      'CreateProductFunction',
      'createProduct',
      props.productTable
    );
    this.lambdaFunctions.push({ name: 'CreateProductFunction', function: createProductFunction });

    const getProductFunction = this.createLambdaFunction(
      'GetProductFunction',
      'getProduct',
      props.productTable
    );
    this.lambdaFunctions.push({ name: 'GetProductFunction', function: getProductFunction });

    const updateProductFunction = this.createLambdaFunction(
      'UpdateProductFunction',
      'updateProduct',
      props.productTable
    );
    this.lambdaFunctions.push({ name: 'UpdateProductFunction', function: updateProductFunction });

    const deleteProductFunction = this.createLambdaFunction(
      'DeleteProductFunction',
      'deleteProduct',
      props.productTable
    );
    this.lambdaFunctions.push({ name: 'DeleteProductFunction', function: deleteProductFunction });

    const listProductsFunction = this.createLambdaFunction(
      'ListProductsFunction',
      'listProducts',
      props.productTable
    );
    this.lambdaFunctions.push({ name: 'ListProductsFunction', function: listProductsFunction });

    // Create the API resources and methods
    const productsResource = this.apiGateway.root.addResource('products');
    const productResource = productsResource.addResource('{id}');

    // POST /products - Create a product
    productsResource.addMethod('POST', new apigateway.LambdaIntegration(createProductFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // GET /products - List products
    productsResource.addMethod('GET', new apigateway.LambdaIntegration(listProductsFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // GET /products/{id} - Get a product by ID
    productResource.addMethod('GET', new apigateway.LambdaIntegration(getProductFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // PUT /products/{id} - Update a product
    productResource.addMethod('PUT', new apigateway.LambdaIntegration(updateProductFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // DELETE /products/{id} - Delete a product
    productResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteProductFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    // Add tags
    cdk.Tags.of(this.apiGateway).add('Service', 'ProductService');
    cdk.Tags.of(this.apiGateway).add('Environment', process.env.CDK_ENV || 'dev');
  }

  /**
   * Create a Lambda function
   * @param id The construct ID
   * @param handler The handler name
   * @param table The DynamoDB table
   * @returns The Lambda function
   */
  private createLambdaFunction(
    id: string,
    handler: string,
    table: dynamodb.Table
  ): lambda.Function {
    // Create the Lambda function using NodejsFunction construct
    const lambdaFunction = new nodejsLambda.NodejsFunction(this, id, {
      functionName: `${handler}-function`,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../handlers/lambda-functions.ts'),
      handler: handler,
      environment: {
        PRODUCT_TABLE_NAME: table.tableName,
        NODE_ENV: process.env.NODE_ENV || 'development'
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
      architecture: lambda.Architecture.ARM_64,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: [
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/lib-dynamodb',
          '@aws-sdk/util-dynamodb'
        ],
        esbuildArgs: {
          '--tree-shaking': 'true',
          '--packages': 'bundle',
        }
      }
    });

    // Grant the Lambda function read/write access to the DynamoDB table
    table.grantReadWriteData(lambdaFunction);

    // Add CloudWatch permissions
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords'
        ],
        resources: ['*']
      })
    );

    return lambdaFunction;
  }
}
