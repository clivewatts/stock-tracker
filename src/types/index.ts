import { User as PrismaUser, ProductType as PrismaProductType, SKU as PrismaSKU, Product as PrismaProduct, Sale as PrismaSale } from '@prisma/client';

// Extended User Type with session information
export interface User extends PrismaUser {
  role: string;
}

// Product Types
export interface ProductType extends PrismaProductType {
  // Add any custom properties beyond Prisma model here
}

// SKU Types
export interface SKU extends PrismaSKU {
  // Add any custom properties beyond Prisma model here
}

// Product Types
export interface Product extends PrismaProduct {
  productType?: ProductType;
  sku?: SKU;
}

// Sale Types
export interface Sale extends PrismaSale {
  product?: Product;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface ProductFormData {
  name: string;
  description?: string;
  barcode?: string;
  imageUrl?: string;
  price: number;
  stockCount: number;
  productTypeId: string;
  skuId?: string;
}

export interface ProductWithExternalIds extends Product {
  externalIds?: Record<string, string>;
}

export interface ProductTypeFormData {
  name: string;
  description?: string;
}

export interface SKUFormData {
  code: string;
  description?: string;
}

export interface SaleFormData {
  productId: string;
  quantity: number;
}

// Integration Settings Types
export interface IntegrationSettings {
  id: string;
  integrationType: string;
  isEnabled: boolean;
  settings: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopifySettings {
  shopName: string;
  apiKey: string;
  apiSecret: string;
  apiVersion: string;
  accessToken: string;
}

export interface IntegrationSettingsFormData {
  isEnabled: boolean;
  shopName: string;
  apiKey: string;
  apiSecret: string;
  apiVersion: string;
  accessToken: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
