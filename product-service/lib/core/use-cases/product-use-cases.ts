import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  GetProductsRequest, 
  GetProductsResponse 
} from '../models/product';
import { ProductRepository } from '../ports/product-repository';

/**
 * Use case for creating a product
 */
export interface CreateProductUseCase {
  execute(product: CreateProductRequest): Promise<Product>;
}

/**
 * Use case for getting a product by ID
 */
export interface GetProductUseCase {
  execute(id: string): Promise<Product>;
}

/**
 * Use case for updating a product
 */
export interface UpdateProductUseCase {
  execute(id: string, product: UpdateProductRequest): Promise<Product>;
}

/**
 * Use case for deleting a product
 */
export interface DeleteProductUseCase {
  execute(id: string): Promise<void>;
}

/**
 * Use case for listing products
 */
export interface ListProductsUseCase {
  execute(request: GetProductsRequest): Promise<GetProductsResponse>;
}

/**
 * Implementation of the CreateProductUseCase
 */
export class CreateProductUseCaseImpl implements CreateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(product: CreateProductRequest): Promise<Product> {
    // Here we could add business logic, validation, etc.
    return this.productRepository.createProduct(product);
  }
}

/**
 * Implementation of the GetProductUseCase
 */
export class GetProductUseCaseImpl implements GetProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product> {
    const product = await this.productRepository.getProductById(id);
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }
    return product;
  }
}

/**
 * Implementation of the UpdateProductUseCase
 */
export class UpdateProductUseCaseImpl implements UpdateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string, product: UpdateProductRequest): Promise<Product> {
    // Check if product exists
    const existingProduct = await this.productRepository.getProductById(id);
    if (!existingProduct) {
      throw new Error(`Product with ID ${id} not found`);
    }
    
    // Update the product
    return this.productRepository.updateProduct(id, product);
  }
}

/**
 * Implementation of the DeleteProductUseCase
 */
export class DeleteProductUseCaseImpl implements DeleteProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<void> {
    // Check if product exists
    const existingProduct = await this.productRepository.getProductById(id);
    if (!existingProduct) {
      throw new Error(`Product with ID ${id} not found`);
    }
    
    // Delete the product
    const deleted = await this.productRepository.deleteProduct(id);
    if (!deleted) {
      throw new Error(`Failed to delete product with ID ${id}`);
    }
  }
}

/**
 * Implementation of the ListProductsUseCase
 */
export class ListProductsUseCaseImpl implements ListProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(request: GetProductsRequest): Promise<GetProductsResponse> {
    return this.productRepository.getProducts(request);
  }
}
