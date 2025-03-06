import { DynamoDBProductRepository } from '../../../lib/adapters/dynamodb-product-repository';
import { ProductStatus } from '../../../lib/core/models/product';
import { v4 as uuidv4 } from 'uuid';

// Mock the AWS SDK v3
jest.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: jest.fn(),
    ReturnValue: {
      ALL_NEW: 'ALL_NEW',
      ALL_OLD: 'ALL_OLD'
    }
  };
});

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = jest.fn();
  
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: mockSend
      }))
    },
    PutCommand: jest.fn(),
    GetCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    DeleteCommand: jest.fn(),
    QueryCommand: jest.fn(),
    ScanCommand: jest.fn()
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid')
}));

describe('DynamoDBProductRepository', () => {
  const mockDynamoDbClient = new (require('@aws-sdk/client-dynamodb')).DynamoDBClient();
  const mockSend = require('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient.from().send;
  const tableName = 'test-table';
  let repository: DynamoDBProductRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new DynamoDBProductRepository(tableName, mockDynamoDbClient);
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      // Mock the current date
      const mockDate = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
      
      // Setup the mock response
      mockSend.mockResolvedValueOnce({});
      
      // Create product request
      const createProductRequest = {
        name: 'Test Product',
        description: 'A test product',
        productType: 'Electronics',
        productCategory: 'Computers',
        price: {
          amount: 99.99,
          currency: 'USD'
        }
      };
      
      // Call the method
      const result = await repository.createProduct(createProductRequest);
      
      // Verify the result
      expect(result).toEqual({
        id: 'mocked-uuid',
        name: 'Test Product',
        description: 'A test product',
        productType: 'Electronics',
        productCategory: 'Computers',
        price: {
          amount: 99.99,
          currency: 'USD'
        },
        status: ProductStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
        media: undefined,
        relatedProducts: undefined,
        customAttributes: undefined,
        productNumber: undefined,
        brand: undefined,
        manufacturer: undefined,
        sku: undefined,
        gtin: undefined,
        dimensions: undefined
      });
      
      // Verify DynamoDB was called correctly
      const { PutCommand } = require('@aws-sdk/lib-dynamodb');
      expect(PutCommand).toHaveBeenCalledWith({
        TableName: tableName,
        Item: {
          PK: 'PRODUCT#mocked-uuid',
          SK: 'PRODUCT#mocked-uuid',
          GSI1PK: 'PRODUCT',
          GSI1SK: 'Electronics#' + mockDate,
          GSI2PK: 'PRODUCT',
          GSI2SK: 'Computers#' + mockDate,
          GSI3PK: 'PRODUCT',
          GSI3SK: 'ACTIVE#' + mockDate,
          id: 'mocked-uuid',
          name: 'Test Product',
          description: 'A test product',
          productType: 'Electronics',
          productCategory: 'Computers',
          price: {
            amount: 99.99,
            currency: 'USD'
          },
          status: ProductStatus.ACTIVE,
          createdAt: mockDate,
          updatedAt: mockDate,
          media: undefined,
          relatedProducts: undefined,
          customAttributes: undefined,
          productNumber: undefined,
          brand: undefined,
          manufacturer: undefined,
          sku: undefined,
          gtin: undefined,
          dimensions: undefined
        }
      });
    });

    it('should create a product with media', async () => {
      // Mock the current date
      const mockDate = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
      
      // Setup the mock response
      mockSend.mockResolvedValueOnce({});
      
      // Create product request with media
      const createProductRequest = {
        name: 'Test Product',
        description: 'A test product',
        media: [
          {
            url: 'https://example.com/image.jpg',
            type: 'image',
            title: 'Product Image'
          }
        ]
      };
      
      // Mock uuid for media ID
      (uuidv4 as jest.Mock).mockReturnValueOnce('mocked-uuid').mockReturnValueOnce('media-uuid');
      
      // Call the method
      const result = await repository.createProduct(createProductRequest);
      
      // Verify the result
      expect(result.media).toEqual([
        {
          id: 'media-uuid',
          url: 'https://example.com/image.jpg',
          type: 'image',
          title: 'Product Image'
        }
      ]);
      
      // Verify DynamoDB was called correctly
      const { PutCommand } = require('@aws-sdk/lib-dynamodb');
      expect(PutCommand).toHaveBeenCalled();
      expect(PutCommand.mock.calls[0][0].Item.media).toEqual([
        {
          id: 'media-uuid',
          url: 'https://example.com/image.jpg',
          type: 'image',
          title: 'Product Image'
        }
      ]);
    });

    it('should create a product with custom status', async () => {
      // Mock the current date
      const mockDate = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
      
      // Setup the mock response
      mockSend.mockResolvedValueOnce({});
      
      // Create product request with custom status
      const createProductRequest = {
        name: 'Test Product',
        description: 'A test product',
        status: ProductStatus.INACTIVE
      };
      
      // Call the method
      const result = await repository.createProduct(createProductRequest);
      
      // Verify the result
      expect(result.status).toBe(ProductStatus.INACTIVE);
      
      // Verify DynamoDB was called correctly
      const { PutCommand } = require('@aws-sdk/lib-dynamodb');
      expect(PutCommand).toHaveBeenCalled();
      expect(PutCommand.mock.calls[0][0].Item.status).toBe(ProductStatus.INACTIVE);
      expect(PutCommand.mock.calls[0][0].Item.GSI3SK).toBe(`${ProductStatus.INACTIVE}#${mockDate}`);
    });
  });

  describe('getProductById', () => {
    it('should return a product when found', async () => {
      // Setup the mock response
      const mockProduct = {
        PK: 'PRODUCT#123',
        SK: 'PRODUCT#123',
        GSI1PK: 'PRODUCT',
        GSI1SK: 'Electronics#2023-01-01T00:00:00.000Z',
        id: '123',
        name: 'Test Product',
        status: ProductStatus.ACTIVE,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };
      
      mockSend.mockResolvedValueOnce({
        Item: mockProduct
      });
      
      // Call the method
      const result = await repository.getProductById('123');
      
      // Verify the result
      expect(result).toEqual({
        id: '123',
        name: 'Test Product',
        status: ProductStatus.ACTIVE,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      });
      
      // Verify DynamoDB was called correctly
      const { GetCommand } = require('@aws-sdk/lib-dynamodb');
      expect(GetCommand).toHaveBeenCalledWith({
        TableName: tableName,
        Key: {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123'
        }
      });
    });
    
    it('should return null when product is not found', async () => {
      // Setup the mock response
      mockSend.mockResolvedValueOnce({
        Item: null
      });
      
      // Call the method
      const result = await repository.getProductById('not-found');
      
      // Verify the result
      expect(result).toBeNull();
    });
  });

  describe('updateProduct', () => {
    it('should update a product successfully', async () => {
      // Mock the current date
      const mockDate = '2023-01-02T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
      
      // Setup the mock responses
      // First for getProductById
      const existingProduct = {
        id: '123',
        name: 'Original Product',
        status: ProductStatus.ACTIVE,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };
      
      mockSend
        .mockResolvedValueOnce({ Item: { ...existingProduct, PK: 'PRODUCT#123', SK: 'PRODUCT#123' } })
        .mockResolvedValueOnce({ 
          Attributes: {
            id: '123',
            name: 'Updated Product',
            status: ProductStatus.ACTIVE,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: mockDate
          }
        });
      
      // Update product request
      const updateProductRequest = {
        name: 'Updated Product'
      };
      
      // Call the method
      const result = await repository.updateProduct('123', updateProductRequest);
      
      // Verify the result
      expect(result).toEqual({
        id: '123',
        name: 'Updated Product',
        status: ProductStatus.ACTIVE,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: mockDate
      });
      
      // Verify DynamoDB was called correctly
      const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
      expect(UpdateCommand).toHaveBeenCalledWith({
        TableName: tableName,
        Key: {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123'
        },
        UpdateExpression: 'SET updatedAt = :updatedAt, #name = :name',
        ExpressionAttributeValues: {
          ':updatedAt': mockDate,
          ':name': 'Updated Product'
        },
        ExpressionAttributeNames: {
          '#name': 'name'
        },
        ReturnValues: 'ALL_NEW'
      });
    });

    it('should update a product with productType, productCategory, and status', async () => {
      // Mock the current date
      const mockDate = '2023-01-02T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
      
      // Setup the mock responses
      // First for getProductById
      const existingProduct = {
        id: '123',
        name: 'Original Product',
        status: ProductStatus.ACTIVE,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };
      
      mockSend
        .mockResolvedValueOnce({ Item: { ...existingProduct, PK: 'PRODUCT#123', SK: 'PRODUCT#123' } })
        .mockResolvedValueOnce({ 
          Attributes: {
            id: '123',
            name: 'Original Product',
            productType: 'Electronics',
            productCategory: 'Computers',
            status: ProductStatus.INACTIVE,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: mockDate
          }
        });
      
      // Update product request
      const updateProductRequest = {
        productType: 'Electronics',
        productCategory: 'Computers',
        status: ProductStatus.INACTIVE
      };
      
      // Call the method
      const result = await repository.updateProduct('123', updateProductRequest);
      
      // Verify the result
      expect(result.productType).toBe('Electronics');
      expect(result.productCategory).toBe('Computers');
      expect(result.status).toBe(ProductStatus.INACTIVE);
      
      // Verify DynamoDB was called correctly
      const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
      expect(UpdateCommand).toHaveBeenCalled();
      
      // Check that GSI keys were updated
      const updateParams = UpdateCommand.mock.calls[0][0];
      expect(updateParams.UpdateExpression).toContain('GSI1SK = :gsi1sk');
      expect(updateParams.UpdateExpression).toContain('GSI2SK = :gsi2sk');
      expect(updateParams.UpdateExpression).toContain('GSI3SK = :gsi3sk');
      expect(updateParams.ExpressionAttributeValues[':gsi1sk']).toBe('Electronics#2023-01-01T00:00:00.000Z');
      expect(updateParams.ExpressionAttributeValues[':gsi2sk']).toBe('Computers#2023-01-01T00:00:00.000Z');
      expect(updateParams.ExpressionAttributeValues[':gsi3sk']).toBe('INACTIVE#2023-01-01T00:00:00.000Z');
    });
    
    it('should throw an error when product is not found', async () => {
      // Setup the mock response
      mockSend.mockResolvedValueOnce({ Item: null });
      
      // Call the method and expect it to throw
      await expect(repository.updateProduct('not-found', { name: 'Updated' }))
        .rejects
        .toThrow('Product with ID not-found not found');
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product successfully', async () => {
      // Setup the mock response
      mockSend.mockResolvedValueOnce({
        Attributes: { id: '123' }
      });
      
      // Call the method
      const result = await repository.deleteProduct('123');
      
      // Verify the result
      expect(result).toBe(true);
      
      // Verify DynamoDB was called correctly
      const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
      expect(DeleteCommand).toHaveBeenCalledWith({
        TableName: tableName,
        Key: {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123'
        },
        ReturnValues: 'ALL_OLD'
      });
    });
    
    it('should return false when product is not found', async () => {
      // Setup the mock response
      mockSend.mockResolvedValueOnce({
        Attributes: null
      });
      
      // Call the method
      const result = await repository.deleteProduct('not-found');
      
      // Verify the result
      expect(result).toBe(false);
    });
  });

  describe('getProducts', () => {
    it('should query products by product type', async () => {
      // Setup the mock response
      const mockItems = [
        {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123',
          id: '123',
          name: 'Product 1',
          productType: 'Electronics',
          status: ProductStatus.ACTIVE,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
        {
          PK: 'PRODUCT#456',
          SK: 'PRODUCT#456',
          id: '456',
          name: 'Product 2',
          productType: 'Electronics',
          status: ProductStatus.ACTIVE,
          createdAt: '2023-01-02T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z'
        }
      ];
      
      mockSend.mockResolvedValueOnce({
        Items: mockItems,
        LastEvaluatedKey: { PK: 'PRODUCT#456' }
      });
      
      // Call the method
      const result = await repository.getProducts({
        filter: {
          productType: 'Electronics'
        }
      });
      
      // Verify the result
      expect(result.products).toHaveLength(2);
      expect(result.products[0].id).toBe('123');
      expect(result.products[1].id).toBe('456');
      expect(result.nextToken).toBeDefined();
      
      // Verify DynamoDB was called correctly
      const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
      expect(QueryCommand).toHaveBeenCalledWith({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT',
          ':sk': 'Electronics#'
        },
        Limit: 20
      });
    });

    it('should query products by product category', async () => {
      // Setup the mock response
      const mockItems = [
        {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123',
          id: '123',
          name: 'Product 1',
          productCategory: 'Computers',
          status: ProductStatus.ACTIVE,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      
      mockSend.mockResolvedValueOnce({
        Items: mockItems
      });
      
      // Call the method
      const result = await repository.getProducts({
        filter: {
          productCategory: 'Computers'
        }
      });
      
      // Verify the result
      expect(result.products).toHaveLength(1);
      expect(result.products[0].productCategory).toBe('Computers');
      
      // Verify DynamoDB was called correctly
      const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
      expect(QueryCommand).toHaveBeenCalledWith({
        TableName: tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT',
          ':sk': 'Computers#'
        },
        Limit: 20
      });
    });

    it('should query products by status', async () => {
      // Setup the mock response
      const mockItems = [
        {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123',
          id: '123',
          name: 'Product 1',
          status: ProductStatus.INACTIVE,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      
      mockSend.mockResolvedValueOnce({
        Items: mockItems
      });
      
      // Call the method
      const result = await repository.getProducts({
        filter: {
          status: ProductStatus.INACTIVE
        }
      });
      
      // Verify the result
      expect(result.products).toHaveLength(1);
      expect(result.products[0].status).toBe(ProductStatus.INACTIVE);
      
      // Verify DynamoDB was called correctly
      const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
      expect(QueryCommand).toHaveBeenCalledWith({
        TableName: tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk AND begins_with(GSI3SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT',
          ':sk': 'INACTIVE#'
        },
        Limit: 20
      });
    });

    it('should filter products by brand', async () => {
      // Setup the mock response
      const mockItems = [
        {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123',
          id: '123',
          name: 'Product 1',
          brand: 'TestBrand',
          status: ProductStatus.ACTIVE,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      
      mockSend.mockResolvedValueOnce({
        Items: mockItems
      });
      
      // Call the method
      const result = await repository.getProducts({
        filter: {
          brand: 'TestBrand'
        }
      });
      
      // Verify the result
      expect(result.products).toHaveLength(1);
      expect(result.products[0].brand).toBe('TestBrand');
      
      // Verify DynamoDB was called correctly
      const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
      expect(ScanCommand).toHaveBeenCalledWith({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :pk) AND brand = :brand',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT#',
          ':brand': 'TestBrand'
        },
        Limit: 20
      });
    });

    it('should filter products by manufacturer', async () => {
      // Setup the mock response
      const mockItems = [
        {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123',
          id: '123',
          name: 'Product 1',
          manufacturer: 'TestManufacturer',
          status: ProductStatus.ACTIVE,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      
      mockSend.mockResolvedValueOnce({
        Items: mockItems
      });
      
      // Call the method
      const result = await repository.getProducts({
        filter: {
          manufacturer: 'TestManufacturer'
        }
      });
      
      // Verify the result
      expect(result.products).toHaveLength(1);
      expect(result.products[0].manufacturer).toBe('TestManufacturer');
      
      // Verify DynamoDB was called correctly
      const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
      expect(ScanCommand).toHaveBeenCalledWith({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :pk) AND manufacturer = :manufacturer',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT#',
          ':manufacturer': 'TestManufacturer'
        },
        Limit: 20
      });
    });

    it('should filter products by price range', async () => {
      // Setup the mock response
      const mockItems = [
        {
          PK: 'PRODUCT#123',
          SK: 'PRODUCT#123',
          id: '123',
          name: 'Product 1',
          price: { amount: 50, currency: 'USD' },
          status: ProductStatus.ACTIVE,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ];
      
      mockSend.mockResolvedValueOnce({
        Items: mockItems
      });
      
      // Call the method
      const result = await repository.getProducts({
        filter: {
          priceRange: { min: 10, max: 100 }
        }
      });
      
      // Verify the result
      expect(result.products).toHaveLength(1);
      expect(result.products[0].price?.amount).toBe(50);
      
      // Verify DynamoDB was called correctly
      const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
      expect(ScanCommand).toHaveBeenCalledWith({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :pk) AND price.amount >= :minPrice AND price.amount <= :maxPrice',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT#',
          ':minPrice': 10,
          ':maxPrice': 100
        },
        Limit: 20
      });
    });

    it('should handle pagination token', async () => {
      // Setup the mock response
      const mockItems = [
        {
          PK: 'PRODUCT#456',
          SK: 'PRODUCT#456',
          id: '456',
          name: 'Product 2',
          status: ProductStatus.ACTIVE,
          createdAt: '2023-01-02T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z'
        }
      ];
      
      // Create a mock pagination token
      const lastEvaluatedKey = { PK: 'PRODUCT#123', SK: 'PRODUCT#123' };
      const paginationToken = Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
      
      mockSend.mockResolvedValueOnce({
        Items: mockItems
      });
      
      // Call the method
      const result = await repository.getProducts({
        nextToken: paginationToken
      });
      
      // Verify the result
      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe('456');
      
      // Verify DynamoDB was called correctly
      const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
      expect(ScanCommand).toHaveBeenCalledWith({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT#'
        },
        Limit: 20,
        ExclusiveStartKey: lastEvaluatedKey
      });
    });
    
    it('should scan all products when no filter is provided', async () => {
      // Setup the mock response
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: 'PRODUCT#123',
            SK: 'PRODUCT#123',
            id: '123',
            name: 'Product 1',
            status: ProductStatus.ACTIVE
          }
        ]
      });
      
      // Call the method
      const result = await repository.getProducts({});
      
      // Verify the result
      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe('123');
      expect(result.nextToken).toBeUndefined();
      
      // Verify DynamoDB was called correctly
      const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
      expect(ScanCommand).toHaveBeenCalledWith({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT#'
        },
        Limit: 20
      });
    });
  });
});
