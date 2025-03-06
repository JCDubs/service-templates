import { DynamoDBClient, ReturnValue } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  GetProductsRequest, 
  GetProductsResponse,
  ProductStatus,
  ProductMedia
} from '../core/models/product';
import { ProductRepository } from '../core/ports/product-repository';

/**
 * DynamoDB implementation of the ProductRepository interface
 * Uses single-table design pattern
 */
export class DynamoDBProductRepository implements ProductRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(tableName: string, dynamoDbClient?: DynamoDBClient) {
    this.tableName = tableName;
    const client = dynamoDbClient || new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  /**
   * Create a new product
   * @param product The product data to create
   * @returns The created product
   */
  async createProduct(product: CreateProductRequest): Promise<Product> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    const newProduct: Product = {
      id,
      name: product.name,
      description: product.description,
      productNumber: product.productNumber,
      productType: product.productType,
      productCategory: product.productCategory,
      brand: product.brand,
      manufacturer: product.manufacturer,
      sku: product.sku,
      gtin: product.gtin,
      price: product.price,
      dimensions: product.dimensions,
      status: product.status || ProductStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      media: product.media?.map(m => ({ id: uuidv4(), ...m })),
      relatedProducts: product.relatedProducts,
      customAttributes: product.customAttributes
    };

    // Create the item in DynamoDB
    const params = {
      TableName: this.tableName,
      Item: {
        PK: `PRODUCT#${id}`,
        SK: `PRODUCT#${id}`,
        GSI1PK: 'PRODUCT',
        GSI1SK: `${product.productType || 'UNKNOWN'}#${now}`,
        GSI2PK: 'PRODUCT',
        GSI2SK: `${product.productCategory || 'UNKNOWN'}#${now}`,
        GSI3PK: 'PRODUCT',
        GSI3SK: `${product.status || ProductStatus.ACTIVE}#${now}`,
        ...newProduct
      }
    };

    await this.docClient.send(new PutCommand(params));
    return newProduct;
  }

  /**
   * Get a product by ID
   * @param id The product ID
   * @returns The product if found, null otherwise
   */
  async getProductById(id: string): Promise<Product | null> {
    const params = {
      TableName: this.tableName,
      Key: {
        PK: `PRODUCT#${id}`,
        SK: `PRODUCT#${id}`
      }
    };

    const result = await this.docClient.send(new GetCommand(params));
    if (!result.Item) {
      return null;
    }

    return this.mapDynamoItemToProduct(result.Item);
  }

  /**
   * Update an existing product
   * @param id The product ID
   * @param product The product data to update
   * @returns The updated product
   */
  async updateProduct(id: string, product: UpdateProductRequest): Promise<Product> {
    // Get the current product
    const currentProduct = await this.getProductById(id);
    if (!currentProduct) {
      throw new Error(`Product with ID ${id} not found`);
    }

    // Build update expression
    const now = new Date().toISOString();
    const updateExpressionParts: string[] = ['SET updatedAt = :updatedAt'];
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': now
    };
    const expressionAttributeNames: Record<string, string> = {};

    // Add each field to the update expression
    Object.entries(product).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpressionParts.push(`#${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
        expressionAttributeNames[`#${key}`] = key;
      }
    });

    // Update GSI keys if relevant fields are updated
    if (product.productType) {
      updateExpressionParts.push('GSI1SK = :gsi1sk');
      expressionAttributeValues[':gsi1sk'] = `${product.productType}#${currentProduct.createdAt}`;
    }

    if (product.productCategory) {
      updateExpressionParts.push('GSI2SK = :gsi2sk');
      expressionAttributeValues[':gsi2sk'] = `${product.productCategory}#${currentProduct.createdAt}`;
    }

    if (product.status) {
      updateExpressionParts.push('GSI3SK = :gsi3sk');
      expressionAttributeValues[':gsi3sk'] = `${product.status}#${currentProduct.createdAt}`;
    }

    // Update the item in DynamoDB
    const params = {
      TableName: this.tableName,
      Key: {
        PK: `PRODUCT#${id}`,
        SK: `PRODUCT#${id}`
      },
      UpdateExpression: updateExpressionParts.join(', '),
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: ReturnValue.ALL_NEW
    };

    const result = await this.docClient.send(new UpdateCommand(params));
    return this.mapDynamoItemToProduct(result.Attributes!);
  }

  /**
   * Delete a product by ID
   * @param id The product ID
   * @returns True if the product was deleted, false otherwise
   */
  async deleteProduct(id: string): Promise<boolean> {
    const params = {
      TableName: this.tableName,
      Key: {
        PK: `PRODUCT#${id}`,
        SK: `PRODUCT#${id}`
      },
      ReturnValues: ReturnValue.ALL_OLD
    };

    const result = await this.docClient.send(new DeleteCommand(params));
    return !!result.Attributes;
  }

  /**
   * Get products with optional filtering, sorting, and pagination
   * @param request The request parameters
   * @returns The products and a next token for pagination
   */
  async getProducts(request: GetProductsRequest): Promise<GetProductsResponse> {
    const limit = request.limit || 20;
    let params: any;

    // Determine which index to use based on filter
    if (request.filter?.productType) {
      // Query by product type using GSI1
      params = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT',
          ':sk': `${request.filter.productType}#`
        },
        Limit: limit
      };
    } else if (request.filter?.productCategory) {
      // Query by product category using GSI2
      params = {
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT',
          ':sk': `${request.filter.productCategory}#`
        },
        Limit: limit
      };
    } else if (request.filter?.status) {
      // Query by status using GSI3
      params = {
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk AND begins_with(GSI3SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT',
          ':sk': `${request.filter.status}#`
        },
        Limit: limit
      };
    } else {
      // Scan all products
      params = {
        TableName: this.tableName,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT#'
        },
        Limit: limit
      };
    }

    // Add pagination token if provided
    if (request.nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(request.nextToken, 'base64').toString());
    }

    // Add additional filters if needed
    const filterExpressions: string[] = [];
    if (request.filter?.brand) {
      filterExpressions.push('brand = :brand');
      params.ExpressionAttributeValues![':brand'] = request.filter.brand;
    }

    if (request.filter?.manufacturer) {
      filterExpressions.push('manufacturer = :manufacturer');
      params.ExpressionAttributeValues![':manufacturer'] = request.filter.manufacturer;
    }

    if (request.filter?.priceRange) {
      if (request.filter.priceRange.min !== undefined) {
        filterExpressions.push('price.amount >= :minPrice');
        params.ExpressionAttributeValues![':minPrice'] = request.filter.priceRange.min;
      }
      if (request.filter.priceRange.max !== undefined) {
        filterExpressions.push('price.amount <= :maxPrice');
        params.ExpressionAttributeValues![':maxPrice'] = request.filter.priceRange.max;
      }
    }

    if (filterExpressions.length > 0) {
      params.FilterExpression = params.FilterExpression 
        ? `${params.FilterExpression} AND ${filterExpressions.join(' AND ')}`
        : filterExpressions.join(' AND ');
    }

    // Execute the query or scan
    const result = 'KeyConditionExpression' in params 
      ? await this.docClient.send(new QueryCommand(params))
      : await this.docClient.send(new ScanCommand(params));

    // Map the results to Product objects
    const products = result.Items?.map(item => this.mapDynamoItemToProduct(item)) || [];

    // Create the next token if there are more results
    let nextToken: string | undefined;
    if (result.LastEvaluatedKey) {
      nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return {
      products,
      nextToken
    };
  }

  /**
   * Map a DynamoDB item to a Product object
   * @param item The DynamoDB item
   * @returns The Product object
   */
  // @ts-ignore - Ignore TypeScript errors for now, will be fixed when types are properly installed
  private mapDynamoItemToProduct(item: any): Product {
    // Extract only the product fields, excluding DynamoDB-specific fields
    return {
      id: item.id as string,
      name: item.name as string,
      description: item.description as string | undefined,
      productNumber: item.productNumber as string | undefined,
      productType: item.productType as string | undefined,
      productCategory: item.productCategory as string | undefined,
      brand: item.brand as string | undefined,
      manufacturer: item.manufacturer as string | undefined,
      sku: item.sku as string | undefined,
      gtin: item.gtin as string | undefined,
      price: item.price as { amount: number; currency: string } | undefined,
      dimensions: item.dimensions as {
        height?: number;
        width?: number;
        depth?: number;
        weight?: number;
        unitOfMeasure?: string;
      } | undefined,
      status: item.status as ProductStatus,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
      media: item.media as ProductMedia[] | undefined,
      relatedProducts: item.relatedProducts as string[] | undefined,
      customAttributes: item.customAttributes as Record<string, any> | undefined
    };
  }
}
