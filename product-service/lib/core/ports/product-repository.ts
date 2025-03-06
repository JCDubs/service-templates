import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  GetProductsRequest, 
  GetProductsResponse 
} from '../models/product';

/**
 * Repository interface for Product entities
 * Following the ports and adapters pattern, this interface defines
 * the port that will be implemented by the adapter (e.g., DynamoDB adapter)
 */
export interface ProductRepository {
  /**
   * Create a new product
   * @param product The product data to create
   * @returns The created product
   */
  createProduct(product: CreateProductRequest): Promise<Product>;

  /**
   * Get a product by ID
   * @param id The product ID
   * @returns The product if found, null otherwise
   */
  getProductById(id: string): Promise<Product | null>;

  /**
   * Update an existing product
   * @param id The product ID
   * @param product The product data to update
   * @returns The updated product
   */
  updateProduct(id: string, product: UpdateProductRequest): Promise<Product>;

  /**
   * Delete a product by ID
   * @param id The product ID
   * @returns True if the product was deleted, false otherwise
   */
  deleteProduct(id: string): Promise<boolean>;

  /**
   * Get products with optional filtering, sorting, and pagination
   * @param request The request parameters
   * @returns The products and a next token for pagination
   */
  getProducts(request: GetProductsRequest): Promise<GetProductsResponse>;
}
