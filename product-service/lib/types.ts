import * as lambda from 'aws-cdk-lib/aws-lambda';

export type LambdaFunctionReference = {
    name: string;
    function: lambda.Function;
}