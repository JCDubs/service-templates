import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { LambdaFunctionReference } from '../types';

/**
 * Props for the MonitoringConstruct
 */
export interface MonitoringConstructProps {
  /**
   * The API Gateway
   */
  api: apigateway.RestApi;

  /**
   * The Lambda functions
   */
  lambdaFunctions: LambdaFunctionReference[];

  /**
   * The DynamoDB product table
   */
  productTable: dynamodb.Table;

  /**
   * Email for alarm notifications (optional)
   */
  alarmEmail?: string;
}

/**
 * Construct for monitoring resources
 */
export class MonitoringConstruct extends Construct {
  /**
   * The SNS topic for alarms
   */
  public readonly alarmTopic: sns.Topic;

  /**
   * The CloudWatch dashboard
   */
  public readonly dashboard: cloudwatch.Dashboard;

  /**
   * The CloudWatch alarms
   */
  private readonly alarms: cloudwatch.Alarm[] = [];

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    // Create the SNS topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'Product Service Alarms'
    });

    // Add email subscription if provided
    if (props.alarmEmail) {
      this.alarmTopic.addSubscription(
        new subscriptions.EmailSubscription(props.alarmEmail)
      );
    }

    // Create a CloudWatch dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'ProductServiceDashboard', {
     dashboardName: 'ProductService'
    });

    // Create API Gateway alarms
    const apiAlarms = this.createApiGatewayAlarms(props.api);

    // Create Lambda alarms
    const lambdaAlarms = props.lambdaFunctions.flatMap(lambdaFunctionReference => 
      this.createLambdaAlarms(lambdaFunctionReference)
    );

    // Create DynamoDB alarms
    const dynamoDbAlarms = this.createDynamoDbAlarms(props.productTable);

    // Add API Gateway widgets to the dashboard
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Requests',
        left: [
          this.createApiMetric(props.api, '4XXError', 'Sum'),
          this.createApiMetric(props.api, '5XXError', 'Sum'),
          this.createApiMetric(props.api, 'Count', 'Sum')
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [
          this.createApiMetric(props.api, 'Latency', 'Average'),
          this.createApiMetric(props.api, 'IntegrationLatency', 'Average')
        ],
        width: 12
      })
    );

    // Add DynamoDB widgets to the dashboard
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Throughput',
        left: [
          this.createDynamoDbMetric(props.productTable, 'ConsumedReadCapacityUnits', 'Sum'),
          this.createDynamoDbMetric(props.productTable, 'ConsumedWriteCapacityUnits', 'Sum')
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Latency',
        left: [
          this.createDynamoDbMetric(props.productTable, 'SuccessfulRequestLatency', 'Average', 'GetItem'),
          this.createDynamoDbMetric(props.productTable, 'SuccessfulRequestLatency', 'Average', 'PutItem'),
          this.createDynamoDbMetric(props.productTable, 'SuccessfulRequestLatency', 'Average', 'Query'),
          this.createDynamoDbMetric(props.productTable, 'SuccessfulRequestLatency', 'Average', 'Scan')
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Errors & Throttles',
        left: [
          this.createDynamoDbMetric(props.productTable, 'ThrottledRequests', 'Sum'),
          this.createDynamoDbMetric(props.productTable, 'SystemErrors', 'Sum'),
          this.createDynamoDbMetric(props.productTable, 'UserErrors', 'Sum')
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Returned Items',
        left: [
          this.createDynamoDbMetric(props.productTable, 'ReturnedItemCount', 'Sum', 'Query'),
          this.createDynamoDbMetric(props.productTable, 'ReturnedItemCount', 'Sum', 'Scan')
        ],
        width: 12
      })
    );

    // Add Lambda widgets to the dashboard
    const lambdaWidgets = props.lambdaFunctions.map(lambdaFunctionReference => {
      return new cloudwatch.GraphWidget({
        title: `Lambda - ${lambdaFunctionReference.name}`,
        left: [
          this.createLambdaMetric(lambdaFunctionReference.function, 'Invocations', 'Sum'),
          this.createLambdaMetric(lambdaFunctionReference.function, 'Errors', 'Sum'),
          this.createLambdaMetric(lambdaFunctionReference.function, 'Throttles', 'Sum')
        ],
        right: [
          this.createLambdaMetric(lambdaFunctionReference.function, 'Duration', 'Average'),
          this.createLambdaMetric(lambdaFunctionReference.function, 'ConcurrentExecutions', 'Maximum')
        ],
        width: 24
      });
    });

    this.dashboard.addWidgets(...lambdaWidgets);

    // Add API Gateway alarm widgets
    const apiAlarmWidgets = apiAlarms.map(alarm => 
      new cloudwatch.AlarmWidget({
        alarm,
        title: alarm.alarmName,
        width: 8,
        height: 6
      })
    );
    
    this.dashboard.addWidgets(...apiAlarmWidgets);

    // Add Lambda alarm widgets
    const lambdaAlarmWidgets = lambdaAlarms.map(alarm => 
      new cloudwatch.AlarmWidget({
        alarm,
        title: alarm.alarmName,
        width: 8,
        height: 6
      })
    );
    
    this.dashboard.addWidgets(...lambdaAlarmWidgets);

    // Add DynamoDB alarm widgets
    const dynamoDbAlarmWidgets = dynamoDbAlarms.map(alarm => 
      new cloudwatch.AlarmWidget({
        alarm,
        title: alarm.alarmName,
        width: 8,
        height: 6
      })
    );
    
    this.dashboard.addWidgets(...dynamoDbAlarmWidgets);

    // Add tags
    cdk.Tags.of(this.dashboard).add('Service', 'ProductService');
    cdk.Tags.of(this.dashboard).add('Environment', process.env.CDK_ENV || 'dev');
  }

  /**
   * Create API Gateway alarms
   * @param api The API Gateway
   * @returns Array of created alarms
   */
  private createApiGatewayAlarms(api: apigateway.RestApi): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];
    
    // 4XX errors alarm
    const api4xxErrorAlarm = new cloudwatch.Alarm(this, 'Api4xxErrorAlarm', {
      metric: this.createApiMetric(api, '4XXError', 'Sum'),
      threshold: 10,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway 4XX errors are high',
      actionsEnabled: true,
      alarmName: `${api.restApiName}-4XXErrors`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    api4xxErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(api4xxErrorAlarm);

    // 5XX errors alarm
    const api5xxErrorAlarm = new cloudwatch.Alarm(this, 'Api5xxErrorAlarm', {
      metric: this.createApiMetric(api, '5XXError', 'Sum'),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway 5XX errors are high',
      actionsEnabled: true,
      alarmName: `${api.restApiName}-5XXErrors`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    api5xxErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(api5xxErrorAlarm);

    // Latency alarm
    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      metric: this.createApiMetric(api, 'Latency', 'Average'),
      threshold: 1000, // 1 second
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway latency is high',
      actionsEnabled: true,
      alarmName: `${api.restApiName}-HighLatency`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    apiLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(apiLatencyAlarm);
    
    return alarms;
  }

  /**
   * Create Lambda alarms
   * @param lambdaFunctionReference The Lambda function reference
   * @returns Array of created alarms
   */
  private createLambdaAlarms(lambdaFunctionReference: LambdaFunctionReference): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];
    
    // Error rate alarm
    const errorAlarm = new cloudwatch.Alarm(this, `${lambdaFunctionReference.name}ErrorAlarm`, {
      metric: this.createLambdaMetric(lambdaFunctionReference.function, 'Errors', 'Sum'),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: `${lambdaFunctionReference.name} error rate is high`,
      actionsEnabled: true,
      alarmName: `${lambdaFunctionReference.name}-Errors`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(errorAlarm);

    // Throttle alarm
    const throttleAlarm = new cloudwatch.Alarm(this, `${lambdaFunctionReference.name}ThrottleAlarm`, {
      metric: this.createLambdaMetric(lambdaFunctionReference.function, 'Throttles', 'Sum'),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: `${lambdaFunctionReference.name} is being throttled`,
      actionsEnabled: true,
      alarmName: `${lambdaFunctionReference.name}-Throttles`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    throttleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(throttleAlarm);

    // Duration alarm
    const durationAlarm = new cloudwatch.Alarm(this, `${lambdaFunctionReference.name}DurationAlarm`, {
      metric: this.createLambdaMetric(lambdaFunctionReference.function, 'Duration', 'Average'),
      threshold: lambdaFunctionReference.function.timeout!.toMilliseconds() * 0.8, // 80% of timeout
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: `${lambdaFunctionReference.name} duration is approaching timeout`,
      actionsEnabled: true,
      alarmName: `${lambdaFunctionReference.name}-HighDuration`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    durationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(durationAlarm);
    
    return alarms;
  }

  /**
   * Create DynamoDB alarms based on AWS best practices
   * @param table The DynamoDB table
   * @returns Array of created alarms
   */
  private createDynamoDbAlarms(table: dynamodb.Table): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];
    
    // System errors alarm
    const systemErrorsAlarm = new cloudwatch.Alarm(this, 'DynamoDbSystemErrorsAlarm', {
      metric: this.createDynamoDbMetric(table, 'SystemErrors', 'Sum'),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'DynamoDB system errors are high',
      actionsEnabled: true,
      alarmName: `${table.tableName}-SystemErrors`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    systemErrorsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(systemErrorsAlarm);

    // Throttled requests alarm
    const throttledRequestsAlarm = new cloudwatch.Alarm(this, 'DynamoDbThrottledRequestsAlarm', {
      metric: this.createDynamoDbMetric(table, 'ThrottledRequests', 'Sum'),
      threshold: 10,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'DynamoDB throttled requests are high',
      actionsEnabled: true,
      alarmName: `${table.tableName}-ThrottledRequests`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    throttledRequestsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(throttledRequestsAlarm);

    // Read latency alarm
    const readLatencyAlarm = new cloudwatch.Alarm(this, 'DynamoDbReadLatencyAlarm', {
      metric: this.createDynamoDbMetric(table, 'SuccessfulRequestLatency', 'Average', 'GetItem'),
      threshold: 100, // 100ms
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'DynamoDB read latency is high',
      actionsEnabled: true,
      alarmName: `${table.tableName}-ReadLatency`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    readLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(readLatencyAlarm);

    // Write latency alarm
    const writeLatencyAlarm = new cloudwatch.Alarm(this, 'DynamoDbWriteLatencyAlarm', {
      metric: this.createDynamoDbMetric(table, 'SuccessfulRequestLatency', 'Average', 'PutItem'),
      threshold: 100, // 100ms
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'DynamoDB write latency is high',
      actionsEnabled: true,
      alarmName: `${table.tableName}-WriteLatency`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    writeLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(writeLatencyAlarm);

    // Query latency alarm
    const queryLatencyAlarm = new cloudwatch.Alarm(this, 'DynamoDbQueryLatencyAlarm', {
      metric: this.createDynamoDbMetric(table, 'SuccessfulRequestLatency', 'Average', 'Query'),
      threshold: 200, // 200ms
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'DynamoDB query latency is high',
      actionsEnabled: true,
      alarmName: `${table.tableName}-QueryLatency`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    queryLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(queryLatencyAlarm);

    // User errors alarm
    const userErrorsAlarm = new cloudwatch.Alarm(this, 'DynamoDbUserErrorsAlarm', {
      metric: this.createDynamoDbMetric(table, 'UserErrors', 'Sum'),
      threshold: 10,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'DynamoDB user errors are high',
      actionsEnabled: true,
      alarmName: `${table.tableName}-UserErrors`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });
    userErrorsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    alarms.push(userErrorsAlarm);
    
    return alarms;
  }

  /**
   * Create an API Gateway metric
   * @param api The API Gateway
   * @param metricName The metric name
   * @param statistic The statistic
   * @returns The metric
   */
  private createApiMetric(
    api: apigateway.RestApi,
    metricName: string,
    statistic: string
  ): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName,
      dimensionsMap: {
        ApiName: api.restApiName
      },
      statistic,
      period: cdk.Duration.minutes(1)
    });
  }

  /**
   * Create a Lambda metric
   * @param lambdaFunction The Lambda function
   * @param metricName The metric name
   * @param statistic The statistic
   * @returns The metric
   */
  private createLambdaMetric(
    lambdaFunction: lambda.Function,
    metricName: string,
    statistic: string
  ): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName,
      dimensionsMap: {
        FunctionName: lambdaFunction.functionName
      },
      statistic,
      period: cdk.Duration.minutes(1)
    });
  }

  /**
   * Create a DynamoDB metric
   * @param table The DynamoDB table
   * @param metricName The metric name
   * @param statistic The statistic
   * @param operation The DynamoDB operation (optional)
   * @returns The metric
   */
  private createDynamoDbMetric(
    table: dynamodb.Table,
    metricName: string,
    statistic: string,
    operation?: string
  ): cloudwatch.Metric {
    const dimensions: Record<string, string> = {
      TableName: table.tableName
    };

    if (operation) {
      dimensions.Operation = operation;
    }

    return new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName,
      dimensionsMap: dimensions,
      statistic,
      period: cdk.Duration.minutes(1)
    });
  }
}
