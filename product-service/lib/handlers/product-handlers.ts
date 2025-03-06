import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CreateProductRequest, 
  UpdateProductRequest, 
  GetProductsRequest 
} from '../core/models/product';
import { 
  CreateProductUseCase, 
  GetProductUseCase, 
  UpdateProductUseCase, 
  DeleteProductUseCase, 
  ListProductsUseCase 
} from '../core/use-cases/product-use-cases';
import { 
  createProductSchema, 
  updateProductSchema, 
  getProductsSchema, 
  productIdSchema, 
  validate 
} from '../validation/product-validation';

/**
 * Base handler class with common functionality
 */
abstract class BaseHandler {
  /**
   * Parse and validate the request body
   * @param event The API Gateway event
   * @param schema The Joi schema to validate against
   * @returns The validated request body
   */
  protected parseAndValidateBody<T>(event: APIGatewayProxyEvent, schema: any): T {
    try {
      const body = JSON.parse(event.body || '{}');
      return validate<T>(schema, body);
    } catch (error) {
      throw new Error(`Invalid request body: ${(error as Error).message}`);
    }
  }

  /**
   * Parse and validate path parameters
   * @param event The API Gateway event
   * @param paramName The parameter name
   * @param schema The Joi schema to validate against
   * @returns The validated parameter value
   */
  protected parseAndValidatePathParam<T>(
    event: APIGatewayProxyEvent, 
    paramName: string, 
    schema: any
  ): T {
    try {
      const value = event.pathParameters?.[paramName];
      if (!value) {
        throw new Error(`Missing path parameter: ${paramName}`);
      }
      return validate<T>(schema, value);
    } catch (error) {
      throw new Error(`Invalid path parameter ${paramName}: ${(error as Error).message}`);
    }
  }

  /**
   * Parse and validate query string parameters
   * @param event The API Gateway event
   * @param schema The Joi schema to validate against
   * @returns The validated query parameters
   */
  protected parseAndValidateQueryParams<T>(event: APIGatewayProxyEvent, schema: any): T {
    try {
      return validate<T>(schema, event.queryStringParameters || {});
    } catch (error) {
      throw new Error(`Invalid query parameters: ${(error as Error).message}`);
    }
  }

  /**
   * Create a successful response
   * @param body The response body
   * @param statusCode The HTTP status code
   * @returns The API Gateway proxy result
   */
  protected createResponse(body: any, statusCode: number = 200): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify(body)
    };
  }

  /**
   * Create an error response
   * @param error The error
   * @param statusCode The HTTP status code
   * @returns The API Gateway proxy result
   */
  protected createErrorResponse(error: Error, statusCode: number = 500): APIGatewayProxyResult {
    console.error('Error:', error);
    
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: error.message,
        // Include stack trace in development, but not in production
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      })
    };
  }
}

/**
 * Handler for creating a product
 */
export class CreateProductHandler extends BaseHandler {
  constructor(private readonly createProductUseCase: CreateProductUseCase) {
    super();
  }

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Parse and validate the request body
      const createProductRequest = this.parseAndValidateBody<CreateProductRequest>(
        event, 
        createProductSchema
      );

      // Create the product
      const product = await this.createProductUseCase.execute(createProductRequest);

      // Return the created product
      return this.createResponse(product, 201);
    } catch (error) {
      return this.createErrorResponse(error as Error, 400);
    }
  }
}

/**
 * Handler for getting a product by ID
 */
export class GetProductHandler extends BaseHandler {
  constructor(private readonly getProductUseCase: GetProductUseCase) {
    super();
  }

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Parse and validate the product ID
      const productId = this.parseAndValidatePathParam<string>(
        event, 
        'id', 
        productIdSchema
      );

      // Get the product
      const product = await this.getProductUseCase.execute(productId);

      // Return the product
      return this.createResponse(product);
    } catch (error) {
      const statusCode = (error as Error).message.includes('not found') ? 404 : 400;
      return this.createErrorResponse(error as Error, statusCode);
    }
  }
}

/**
 * Handler for updating a product
 */
export class UpdateProductHandler extends BaseHandler {
  constructor(private readonly updateProductUseCase: UpdateProductUseCase) {
    super();
  }

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Parse and validate the product ID
      const productId = this.parseAndValidatePathParam<string>(
        event, 
        'id', 
        productIdSchema
      );

      // Parse and validate the request body
      const updateProductRequest = this.parseAndValidateBody<UpdateProductRequest>(
        event, 
        updateProductSchema
      );

      // Update the product
      const product = await this.updateProductUseCase.execute(productId, updateProductRequest);

      // Return the updated product
      return this.createResponse(product);
    } catch (error) {
      const statusCode = (error as Error).message.includes('not found') ? 404 : 400;
      return this.createErrorResponse(error as Error, statusCode);
    }
  }
}

/**
 * Handler for deleting a product
 */
export class DeleteProductHandler extends BaseHandler {
  constructor(private readonly deleteProductUseCase: DeleteProductUseCase) {
    super();
  }

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Parse and validate the product ID
      const productId = this.parseAndValidatePathParam<string>(
        event, 
        'id', 
        productIdSchema
      );

      // Delete the product
      await this.deleteProductUseCase.execute(productId);

      // Return a success response
      return this.createResponse({ message: 'Product deleted successfully' }, 204);
    } catch (error) {
      const statusCode = (error as Error).message.includes('not found') ? 404 : 400;
      return this.createErrorResponse(error as Error, statusCode);
    }
  }
}

/**
 * Handler for listing products
 */
export class ListProductsHandler extends BaseHandler {
  constructor(private readonly listProductsUseCase: ListProductsUseCase) {
    super();
  }

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Parse and validate the query parameters
      const getProductsRequest = this.parseAndValidateQueryParams<GetProductsRequest>(
        event, 
        getProductsSchema
      );

      // Get the products
      const response = await this.listProductsUseCase.execute(getProductsRequest);

      // Return the products
      return this.createResponse(response);
    } catch (error) {
      return this.createErrorResponse(error as Error, 400);
    }
  }
}
