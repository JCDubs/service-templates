/**
 * Product interface based on Microsoft Common Data Model
 * https://docs.microsoft.com/en-us/common-data-model/schema/core/applicationcommon/product
 */
export interface Product {
  id: string;
  name: string;
  description?: string;
  productNumber?: string;
  productType?: string;
  productCategory?: string;
  brand?: string;
  manufacturer?: string;
  sku?: string;
  gtin?: string; // Global Trade Item Number (can be UPC, EAN, etc.)
  price?: {
    amount: number;
    currency: string;
  };
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    weight?: number;
    unitOfMeasure?: string;
  };
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  media?: ProductMedia[];
  relatedProducts?: string[]; // Array of related product IDs
  customAttributes?: Record<string, any>; // For any additional attributes
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED'
}

export interface ProductMedia {
  id: string;
  type: string; // e.g., 'image', 'video', 'document'
  url: string;
  title?: string;
  description?: string;
  isPrimary?: boolean;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  productNumber?: string;
  productType?: string;
  productCategory?: string;
  brand?: string;
  manufacturer?: string;
  sku?: string;
  gtin?: string;
  price?: {
    amount: number;
    currency: string;
  };
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    weight?: number;
    unitOfMeasure?: string;
  };
  status?: ProductStatus;
  media?: Omit<ProductMedia, 'id'>[];
  relatedProducts?: string[];
  customAttributes?: Record<string, any>;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  productNumber?: string;
  productType?: string;
  productCategory?: string;
  brand?: string;
  manufacturer?: string;
  sku?: string;
  gtin?: string;
  price?: {
    amount: number;
    currency: string;
  };
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    weight?: number;
    unitOfMeasure?: string;
  };
  status?: ProductStatus;
  media?: Omit<ProductMedia, 'id'>[];
  relatedProducts?: string[];
  customAttributes?: Record<string, any>;
}

export interface GetProductsRequest {
  limit?: number;
  nextToken?: string;
  filter?: {
    productType?: string;
    productCategory?: string;
    brand?: string;
    manufacturer?: string;
    status?: ProductStatus;
    priceRange?: {
      min?: number;
      max?: number;
    };
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface GetProductsResponse {
  products: Product[];
  nextToken?: string;
}
