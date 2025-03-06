import * as Joi from 'joi';
import { ProductStatus } from '../core/models/product';

// Common schema fragments
const priceSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required() // ISO 4217 currency code
});

const dimensionsSchema = Joi.object({
  height: Joi.number().positive(),
  width: Joi.number().positive(),
  depth: Joi.number().positive(),
  weight: Joi.number().positive(),
  unitOfMeasure: Joi.string()
});

const mediaSchema = Joi.object({
  type: Joi.string().required(),
  url: Joi.string().uri().required(),
  title: Joi.string(),
  description: Joi.string(),
  isPrimary: Joi.boolean()
});

// Create product schema
export const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000),
  productNumber: Joi.string().max(100),
  productType: Joi.string().max(100),
  productCategory: Joi.string().max(100),
  brand: Joi.string().max(100),
  manufacturer: Joi.string().max(100),
  sku: Joi.string().max(100),
  gtin: Joi.string().max(100),
  price: priceSchema,
  dimensions: dimensionsSchema,
  status: Joi.string().valid(...Object.values(ProductStatus)).default(ProductStatus.ACTIVE),
  media: Joi.array().items(mediaSchema),
  relatedProducts: Joi.array().items(Joi.string()),
  customAttributes: Joi.object()
});

// Update product schema
export const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  description: Joi.string().max(2000),
  productNumber: Joi.string().max(100),
  productType: Joi.string().max(100),
  productCategory: Joi.string().max(100),
  brand: Joi.string().max(100),
  manufacturer: Joi.string().max(100),
  sku: Joi.string().max(100),
  gtin: Joi.string().max(100),
  price: priceSchema,
  dimensions: dimensionsSchema,
  status: Joi.string().valid(...Object.values(ProductStatus)),
  media: Joi.array().items(mediaSchema),
  relatedProducts: Joi.array().items(Joi.string()),
  customAttributes: Joi.object()
}).min(1); // At least one field must be provided

// Get products schema
export const getProductsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  nextToken: Joi.string(),
  filter: Joi.object({
    productType: Joi.string(),
    productCategory: Joi.string(),
    brand: Joi.string(),
    manufacturer: Joi.string(),
    status: Joi.string().valid(...Object.values(ProductStatus)),
    priceRange: Joi.object({
      min: Joi.number().positive(),
      max: Joi.number().positive().greater(Joi.ref('min'))
    })
  }),
  sort: Joi.object({
    field: Joi.string().valid('name', 'createdAt', 'price.amount'),
    direction: Joi.string().valid('asc', 'desc').default('asc')
  })
});

// Product ID schema
export const productIdSchema = Joi.string().required();

/**
 * Validate data against a schema
 * @param schema The Joi schema to validate against
 * @param data The data to validate
 * @returns The validated data
 * @throws Error if validation fails
 */
export function validate<T>(schema: Joi.Schema, data: any): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Validation error: ${errorMessage}`);
  }

  return value as T;
}
