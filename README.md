# Microservices Architecture Patterns

## Overview

This repository contains a collection of microservices implementing modern software architecture patterns and best practices. Each service is designed as a standalone application following clean architecture principles, with a focus on AWS serverless technologies and infrastructure as code.

## Architecture Principles

All services in this repository follow these core architectural principles:

- **Clean Architecture**: Separation of concerns with domain models at the center
- **Hexagonal Architecture (Ports and Adapters)**: Clear boundaries between application core and external dependencies
- **SOLID Principles**: Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion
- **Infrastructure as Code**: All infrastructure defined using AWS CDK
- **Serverless First**: Leveraging AWS Lambda, API Gateway, and other serverless technologies
- **Single Table Design**: Efficient DynamoDB usage with appropriate access patterns

## Available Services

### Order Service

A serverless API for managing customer orders with the following features:
- Complete CRUD operations for orders
- Authentication and authorization via AWS Cognito
- DynamoDB for persistence with single table design
- Comprehensive test suite and Postman collections

[View Order Service Documentation](./order-service/README.md)

### Product Service

A serverless API for managing product information with the following features:
- Product catalog management
- Integration with authentication system
- DynamoDB for persistence
- Monitoring and observability

[View Product Service Documentation](./product-service/README.md)

## Common Patterns

### AWS Well-Architected Framework

All services follow AWS Well-Architected best practices:
- **Operational Excellence**: Infrastructure as code, monitoring, and observability
- **Security**: Proper IAM roles, authentication, and authorization
- **Reliability**: Resilient design with appropriate error handling
- **Performance Efficiency**: Serverless architecture for automatic scaling
- **Cost Optimization**: Pay-per-use model with serverless components

### AWS CDK Implementation

Services use AWS CDK with TypeScript for infrastructure definition:
- Separate stacks for stateful and stateless resources
- L2 constructs for better abstraction and defaults
- esbuild for Lambda function bundling
- Proper IAM permissions following least privilege principle

### Lambda Implementation

Lambda functions follow these patterns:
- Node.js runtime with TypeScript
- AWS Lambda Powertools for logging, metrics, and tracing
- Middy middleware for common handler patterns
- Proper error handling and response formatting

## Getting Started

To work with any of the services in this repository:

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/microservices-patterns.git
   cd microservices-patterns
   ```

2. Navigate to the service directory of interest
   ```bash
   cd order-service
   # or
   cd product-service
   ```

3. Follow the README instructions in the specific service directory for setup, deployment, and usage details.

## Prerequisites

- Node.js (version specified in each service's .nvmrc file)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally
- Basic understanding of serverless architecture and AWS services

## Contributing

When contributing to this repository, please ensure you follow the established patterns and practices:

1. Maintain clean architecture principles
2. Code through interfaces
3. Follow SOLID principles
4. Adhere to AWS Well-Architected best practices
5. Implement proper testing
6. Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.
