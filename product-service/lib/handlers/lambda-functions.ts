import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBProductRepository } from '../adapters/dynamodb-product-repository';
import { 
  CreateProductUseCaseImpl, 
  GetProductUseCaseImpl, 
  UpdateProductUseCaseImpl, 
  DeleteProductUseCaseImpl, 
  ListProductsUseCaseImpl 
} from '../core/use-cases/product-use-cases';
import { 
  CreateProductHandler, 
  GetProductHandler, 
  UpdateProductHandler, 
  DeleteProductHandler, 
  ListProductsHandler 
} from './product-handlers';

// Get the table name from environment variables
const tableName = process.env.PRODUCT_TABLE_NAME || '';

// Create the repository
const productRepository = new DynamoDBProductRepository(tableName);

// Create the use cases
const createProductUseCase = new CreateProductUseCaseImpl(productRepository);
const getProductUseCase = new GetProductUseCaseImpl(productRepository);
const updateProductUseCase = new UpdateProductUseCaseImpl(productRepository);
const deleteProductUseCase = new DeleteProductUseCaseImpl(productRepository);
const listProductsUseCase = new ListProductsUseCaseImpl(productRepository);

// Create the handlers
const createProductHandler = new CreateProductHandler(createProductUseCase);
const getProductHandler = new GetProductHandler(getProductUseCase);
const updateProductHandler = new UpdateProductHandler(updateProductUseCase);
const deleteProductHandler = new DeleteProductHandler(deleteProductUseCase);
const listProductsHandler = new ListProductsHandler(listProductsUseCase);

/**
 * Lambda function to create a product
 */
export const createProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return createProductHandler.handle(event);
};

/**
 * Lambda function to get a product by ID
 */
export const getProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return getProductHandler.handle(event);
};

/**
 * Lambda function to update a product
 */
export const updateProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return updateProductHandler.handle(event);
};

/**
 * Lambda function to delete a product
 */
export const deleteProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return deleteProductHandler.handle(event);
};

/**
 * Lambda function to list products
 */
export const listProducts = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return listProductsHandler.handle(event);
};
