import { 
  CreateProductHandler, 
  GetProductHandler, 
  UpdateProductHandler, 
  DeleteProductHandler, 
  ListProductsHandler 
} from '../../../lib/handlers/product-handlers';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { ProductStatus } from '../../../lib/core/models/product';

// Mock the validation module
jest.mock('../../../lib/validation/product-validation', () => ({
  validate: jest.fn((schema, data) => data),
  createProductSchema: {},
  updateProductSchema: {},
  getProductsSchema: {},
  productIdSchema: {}
}));

describe('Product Handlers', () => {
  // Common test data
  const mockProduct = {
    id: '123',
    name: 'Test Product',
    description: 'A test product',
    status: ProductStatus.ACTIVE,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  // Helper to create a mock API Gateway event
  const createMockEvent = (
    pathParameters?: Record<string, string>,
    body?: any,
    queryStringParameters?: Record<string, string>
  ): APIGatewayProxyEvent => {
    return {
      pathParameters: pathParameters || null,
      body: body ? JSON.stringify(body) : null,
      queryStringParameters: queryStringParameters || null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/',
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: ''
    } as APIGatewayProxyEvent;
  };

  describe('CreateProductHandler', () => {
    it('should create a product successfully', async () => {
      // Create mock use case
      const mockCreateProductUseCase = {
        execute: jest.fn().mockResolvedValue(mockProduct)
      };

      // Create handler
      const handler = new CreateProductHandler(mockCreateProductUseCase);

      // Create mock event
      const event = createMockEvent(
        undefined,
        { name: 'Test Product', description: 'A test product' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual(mockProduct);

      // Verify the use case was called correctly
      expect(mockCreateProductUseCase.execute).toHaveBeenCalledWith({
        name: 'Test Product',
        description: 'A test product'
      });
    });

    it('should handle validation errors', async () => {
      // Mock validation to throw an error
      const validateMock = require('../../../lib/validation/product-validation').validate;
      validateMock.mockImplementationOnce(() => {
        throw new Error('Validation error: Name is required');
      });

      // Create mock use case
      const mockCreateProductUseCase = {
        execute: jest.fn()
      };

      // Create handler
      const handler = new CreateProductHandler(mockCreateProductUseCase);

      // Create mock event with invalid data
      const event = createMockEvent(
        undefined,
        { description: 'Missing name' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Validation error');

      // Verify the use case was not called
      expect(mockCreateProductUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('GetProductHandler', () => {
    it('should get a product by ID successfully', async () => {
      // Create mock use case
      const mockGetProductUseCase = {
        execute: jest.fn().mockResolvedValue(mockProduct)
      };

      // Create handler
      const handler = new GetProductHandler(mockGetProductUseCase);

      // Create mock event
      const event = createMockEvent({ id: '123' });

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockProduct);

      // Verify the use case was called correctly
      expect(mockGetProductUseCase.execute).toHaveBeenCalledWith('123');
    });

    it('should return 404 when product is not found', async () => {
      // Create mock use case that throws a not found error
      const mockGetProductUseCase = {
        execute: jest.fn().mockRejectedValue(new Error('Product with ID 123 not found'))
      };

      // Create handler
      const handler = new GetProductHandler(mockGetProductUseCase);

      // Create mock event
      const event = createMockEvent({ id: '123' });

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).message).toContain('not found');
    });
  });

  describe('UpdateProductHandler', () => {
    it('should update a product successfully', async () => {
      // Create mock use case
      const mockUpdateProductUseCase = {
        execute: jest.fn().mockResolvedValue({
          ...mockProduct,
          name: 'Updated Product',
          updatedAt: '2023-01-02T00:00:00.000Z'
        })
      };

      // Create handler
      const handler = new UpdateProductHandler(mockUpdateProductUseCase);

      // Create mock event
      const event = createMockEvent(
        { id: '123' },
        { name: 'Updated Product' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).name).toBe('Updated Product');

      // Verify the use case was called correctly
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledWith('123', { name: 'Updated Product' });
    });

    it('should return 404 when product is not found', async () => {
      // Create mock use case that throws a not found error
      const mockUpdateProductUseCase = {
        execute: jest.fn().mockRejectedValue(new Error('Product with ID 123 not found'))
      };

      // Create handler
      const handler = new UpdateProductHandler(mockUpdateProductUseCase);

      // Create mock event
      const event = createMockEvent(
        { id: '123' },
        { name: 'Updated Product' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).message).toContain('not found');
    });

    it('should handle validation errors', async () => {
      // Mock validation to throw an error
      const validateMock = require('../../../lib/validation/product-validation').validate;
      validateMock.mockImplementationOnce(() => {
        throw new Error('Validation error: Invalid product ID');
      });

      // Create mock use case
      const mockUpdateProductUseCase = {
        execute: jest.fn()
      };

      // Create handler
      const handler = new UpdateProductHandler(mockUpdateProductUseCase);

      // Create mock event with invalid ID
      const event = createMockEvent(
        { id: 'invalid-id' },
        { name: 'Updated Product' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Validation error');

      // Verify the use case was not called
      expect(mockUpdateProductUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle missing path parameters', async () => {
      // Create mock use case
      const mockUpdateProductUseCase = {
        execute: jest.fn()
      };

      // Create handler
      const handler = new UpdateProductHandler(mockUpdateProductUseCase);

      // Create mock event with missing ID
      const event = createMockEvent(
        undefined,
        { name: 'Updated Product' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Missing path parameter: id');

      // Verify the use case was not called
      expect(mockUpdateProductUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('DeleteProductHandler', () => {
    it('should delete a product successfully', async () => {
      // Create mock use case
      const mockDeleteProductUseCase = {
        execute: jest.fn().mockResolvedValue(undefined)
      };

      // Create handler
      const handler = new DeleteProductHandler(mockDeleteProductUseCase);

      // Create mock event
      const event = createMockEvent({ id: '123' });

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(204);

      // Verify the use case was called correctly
      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledWith('123');
    });

    it('should return 404 when product is not found', async () => {
      // Create mock use case that throws a not found error
      const mockDeleteProductUseCase = {
        execute: jest.fn().mockRejectedValue(new Error('Product with ID 123 not found'))
      };

      // Create handler
      const handler = new DeleteProductHandler(mockDeleteProductUseCase);

      // Create mock event
      const event = createMockEvent({ id: '123' });

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).message).toContain('not found');
    });

    it('should handle validation errors', async () => {
      // Mock validation to throw an error
      const validateMock = require('../../../lib/validation/product-validation').validate;
      validateMock.mockImplementationOnce(() => {
        throw new Error('Validation error: Invalid product ID');
      });

      // Create mock use case
      const mockDeleteProductUseCase = {
        execute: jest.fn()
      };

      // Create handler
      const handler = new DeleteProductHandler(mockDeleteProductUseCase);

      // Create mock event with invalid ID
      const event = createMockEvent({ id: 'invalid-id' });

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Validation error');

      // Verify the use case was not called
      expect(mockDeleteProductUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('ListProductsHandler', () => {
    it('should list products successfully', async () => {
      // Create mock use case
      const mockListProductsUseCase = {
        execute: jest.fn().mockResolvedValue({
          products: [mockProduct],
          nextToken: 'next-page-token'
        })
      };

      // Create handler
      const handler = new ListProductsHandler(mockListProductsUseCase);

      // Create mock event
      const event = createMockEvent(
        undefined,
        undefined,
        { limit: '10', 'filter.productType': 'Electronics' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.products).toHaveLength(1);
      expect(body.nextToken).toBe('next-page-token');

      // Verify the use case was called correctly
      expect(mockListProductsUseCase.execute).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      // Mock validation to throw an error
      const validateMock = require('../../../lib/validation/product-validation').validate;
      validateMock.mockImplementationOnce(() => {
        throw new Error('Validation error: Invalid limit');
      });

      // Create mock use case
      const mockListProductsUseCase = {
        execute: jest.fn()
      };

      // Create handler
      const handler = new ListProductsHandler(mockListProductsUseCase);

      // Create mock event with invalid query parameters
      const event = createMockEvent(
        undefined,
        undefined,
        { limit: 'invalid' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Invalid query parameters');

      // Verify the use case was not called
      expect(mockListProductsUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('BaseHandler', () => {
    // Test the parseAndValidateBody method
    it('should handle invalid JSON in request body', async () => {
      // Create a handler that extends BaseHandler
      const handler = new CreateProductHandler({
        execute: jest.fn()
      });

      // Create mock event with invalid JSON
      const event = {
        ...createMockEvent(),
        body: '{invalid json'
      };

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Invalid request body');
    });

    // Test the createErrorResponse method with development environment
    it('should include stack trace in error response in development', async () => {
      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Set NODE_ENV to development
      process.env.NODE_ENV = 'development';
      
      // Create a handler that extends BaseHandler
      const handler = new CreateProductHandler({
        execute: jest.fn().mockRejectedValue(new Error('Test error'))
      });

      // Create mock event
      const event = createMockEvent(
        undefined,
        { name: 'Test Product' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).stack).toBeDefined();
      
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });

    // Test the createErrorResponse method with production environment
    it('should not include stack trace in error response in production', async () => {
      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Set NODE_ENV to production
      process.env.NODE_ENV = 'production';
      
      // Create a handler that extends BaseHandler
      const handler = new CreateProductHandler({
        execute: jest.fn().mockRejectedValue(new Error('Test error'))
      });

      // Create mock event
      const event = createMockEvent(
        undefined,
        { name: 'Test Product' }
      );

      // Call the handler
      const result = await handler.handle(event);

      // Verify the result
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).stack).toBeUndefined();
      
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
