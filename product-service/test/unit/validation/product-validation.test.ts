import { 
  createProductSchema, 
  updateProductSchema, 
  getProductsSchema, 
  productIdSchema, 
  validate 
} from '../../../lib/validation/product-validation';
import { ProductStatus } from '../../../lib/core/models/product';

describe('Product Validation', () => {
  describe('createProductSchema', () => {
    it('should validate a valid product', () => {
      const validProduct = {
        name: 'Test Product',
        description: 'A test product',
        productType: 'Electronics',
        productCategory: 'Computers',
        brand: 'Test Brand',
        manufacturer: 'Test Manufacturer',
        sku: 'TEST-123',
        gtin: '1234567890123',
        price: {
          amount: 99.99,
          currency: 'USD'
        },
        status: ProductStatus.ACTIVE
      };

      const result = validate(createProductSchema, validProduct);
      expect(result).toEqual(validProduct);
    });

    it('should throw an error for invalid product', () => {
      const invalidProduct = {
        // Missing required name field
        description: 'A test product',
        price: {
          amount: -10, // Invalid negative price
          currency: 'USD'
        }
      };

      expect(() => {
        validate(createProductSchema, invalidProduct);
      }).toThrow('Validation error');
    });

    it('should set default status if not provided', () => {
      const productWithoutStatus = {
        name: 'Test Product',
        description: 'A test product'
      };

      const result = validate<any>(createProductSchema, productWithoutStatus);
      expect(result.status).toBe(ProductStatus.ACTIVE);
    });
  });

  describe('updateProductSchema', () => {
    it('should validate a valid product update', () => {
      const validUpdate = {
        name: 'Updated Product',
        price: {
          amount: 199.99,
          currency: 'USD'
        }
      };

      const result = validate(updateProductSchema, validUpdate);
      expect(result).toEqual(validUpdate);
    });

    it('should throw an error if no fields are provided', () => {
      const emptyUpdate = {};

      expect(() => {
        validate(updateProductSchema, emptyUpdate);
      }).toThrow('Validation error');
    });

    it('should throw an error for invalid fields', () => {
      const invalidUpdate = {
        name: '', // Empty name
        price: {
          amount: 0, // Zero price
          currency: 'INVALID' // Invalid currency code (not 3 chars)
        }
      };

      expect(() => {
        validate(updateProductSchema, invalidUpdate);
      }).toThrow('Validation error');
    });
  });

  describe('getProductsSchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        limit: 50,
        filter: {
          productType: 'Electronics',
          status: ProductStatus.ACTIVE,
          priceRange: {
            min: 10,
            max: 100
          }
        },
        sort: {
          field: 'name',
          direction: 'asc'
        }
      };

      const result = validate(getProductsSchema, validQuery);
      expect(result).toEqual(validQuery);
    });

    it('should set default values for missing fields', () => {
      const result = validate<any>(getProductsSchema, {});
      expect(result.limit).toBe(20);
    });

    it('should throw an error for invalid query parameters', () => {
      const invalidQuery = {
        limit: 200, // Exceeds max limit
        filter: {
          status: 'INVALID_STATUS', // Invalid status
          priceRange: {
            min: 100,
            max: 50 // max less than min
          }
        }
      };

      expect(() => {
        validate(getProductsSchema, invalidQuery);
      }).toThrow('Validation error');
    });
  });

  describe('productIdSchema', () => {
    it('should validate a valid product ID', () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const result = validate(productIdSchema, validId);
      expect(result).toBe(validId);
    });

    it('should throw an error for an empty product ID', () => {
      expect(() => {
        validate(productIdSchema, '');
      }).toThrow('Validation error');
    });
  });
});
