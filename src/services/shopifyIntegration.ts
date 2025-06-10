/**
 * Shopify Integration Service
 * Handles communication with Shopify API for product synchronization
 */

import prisma from '@/lib/prisma';
import Shopify from 'shopify-api-node';
import { IntegrationSettings, Product, ProductWithExternalIds, ShopifySettings } from '@/types';

/**
 * Initialize a Shopify client instance with stored credentials
 */
export async function getShopifyClient(): Promise<Shopify | null> {
  try {
    // Get Shopify integration settings from database
    const shopifySettings = await getShopifySettings();
    
    if (!shopifySettings || !shopifySettings.isEnabled) {
      console.log('Shopify integration is not enabled');
      return null;
    }

    const { shopName, accessToken, apiVersion } = shopifySettings.settings as unknown as ShopifySettings;
    
    if (!shopName || !accessToken) {
      console.error('Missing required Shopify credentials');
      return null;
    }

    // Initialize Shopify client
    return new Shopify({
      shopName,
      accessToken,
      apiVersion: apiVersion || '2023-10',
    });
  } catch (error) {
    console.error('Failed to initialize Shopify client:', error);
    return null;
  }
}

/**
 * Get Shopify integration settings from database
 */
export async function getShopifySettings(): Promise<IntegrationSettings | null> {
  try {
    const settings = await prisma.integrationSettings.findUnique({
      where: {
        integrationType: 'shopify',
      },
    });
    return settings as unknown as IntegrationSettings;
  } catch (error) {
    console.error('Failed to get Shopify settings:', error);
    return null;
  }
}

/**
 * Save Shopify integration settings to database
 */
export async function saveShopifySettings(settings: ShopifySettings, isEnabled: boolean): Promise<IntegrationSettings | null> {
  try {
    const existingSettings = await prisma.integrationSettings.findUnique({
      where: {
        integrationType: 'shopify',
      },
    });

    if (existingSettings) {
      // Update existing settings
      return await prisma.integrationSettings.update({
        where: {
          id: existingSettings.id,
        },
        data: {
          isEnabled,
          settings: settings as unknown as Record<string, unknown>,
        },
      }) as unknown as IntegrationSettings;
    } else {
      // Create new settings
      return await prisma.integrationSettings.create({
        data: {
          integrationType: 'shopify',
          isEnabled,
          settings: settings as unknown as Record<string, unknown>,
        },
      }) as unknown as IntegrationSettings;
    }
  } catch (error) {
    console.error('Failed to save Shopify settings:', error);
    return null;
  }
}

/**
 * Test Shopify connection
 */
export async function testShopifyConnection(settings: ShopifySettings): Promise<boolean> {
  try {
    const shopify = new Shopify({
      shopName: settings.shopName,
      accessToken: settings.accessToken,
      apiVersion: settings.apiVersion || '2023-10',
    });

    // Try to get shop info to test connection
    const shopInfo = await shopify.shop.get();
    return !!shopInfo;
  } catch (error) {
    console.error('Failed to connect to Shopify:', error);
    return false;
  }
}

/**
 * Sync product to Shopify
 */
export async function syncProductToShopify(product: ProductWithExternalIds): Promise<boolean> {
  try {
    const shopify = await getShopifyClient();
    if (!shopify) return false;

    // Extract Shopify product ID if exists
    const externalIds = product.externalIds ? { ...product.externalIds } : {};
    const shopifyProductId = externalIds.shopify;

    // Map product to Shopify format
    const shopifyProduct = mapToShopifyProduct(product);

    if (shopifyProductId) {
      // Update existing product
      await shopify.product.update(parseInt(shopifyProductId), shopifyProduct);
    } else {
      // Create new product
      const newProduct = await shopify.product.create(shopifyProduct);
      
      // Save Shopify ID back to our database
      if (newProduct?.id) {
        externalIds.shopify = newProduct.id.toString();
        await prisma.product.update({
          where: { id: product.id },
          data: { externalIds },
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to sync product to Shopify:', error);
    return false;
  }
}

/**
 * Map our product format to Shopify product format
 */
function mapToShopifyProduct(product: Product): Record<string, unknown> {
  return {
    title: product.name,
    body_html: product.description || '',
    vendor: 'Default Vendor', // This could be configurable
    product_type: product.productType?.name || 'Default',
    barcode: product.barcode || '',
    published: true,
    variants: [
      {
        price: product.price,
        sku: product.sku?.code || '',
        inventory_quantity: product.stockCount,
        inventory_management: 'shopify',
      }
    ],
    images: product.imageUrl ? [{ src: product.imageUrl }] : [],
  };
}

/**
 * Update a product with Shopify ID
 */
export async function updateProductWithShopifyId(productId: string, shopifyId: string): Promise<boolean> {
  try {
    // Get current external IDs
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { externalIds: true },
    });

    const externalIds = (currentProduct?.externalIds as Record<string, string> || {});
    
    // Update with new Shopify ID
    const updatedExternalIds = {
      ...externalIds,
      shopify: shopifyId,
    };

    // Save back to database
    await prisma.product.update({
      where: { id: productId },
      data: { externalIds: updatedExternalIds },
    });

    return true;
  } catch (error) {
    console.error('Failed to update product with Shopify ID:', error);
    return false;
  }
}

/**
 * Sync inventory to Shopify
 */
export async function syncInventoryToShopify(productId: string, quantity: number): Promise<boolean> {
  try {
    const shopify = await getShopifyClient();
    if (!shopify) return false;

    // Get product from our database
    const product = await prisma.product.findUnique({
      where: { id: productId },
    }) as ProductWithExternalIds;

    if (!product?.externalIds?.shopify) {
      console.error('Product does not have a Shopify ID');
      return false;
    }

    // Get inventory item ID for the first variant
    const shopifyProductId = product.externalIds.shopify;
    const shopifyProduct = await shopify.product.get(parseInt(shopifyProductId));
    
    if (!shopifyProduct.variants || shopifyProduct.variants.length === 0) {
      console.error('No variants found for Shopify product');
      return false;
    }

    const inventoryItemId = shopifyProduct.variants[0].inventory_item_id;

    // Get inventory levels for this item
    const inventoryLevels = await shopify.inventoryLevel.list({
      inventory_item_ids: inventoryItemId,
    });

    if (inventoryLevels.length === 0) {
      console.error('No inventory levels found for product');
      return false;
    }

    // Update inventory level
    const { location_id } = inventoryLevels[0];
    await shopify.inventoryLevel.set({
      inventory_item_id: inventoryItemId,
      location_id,
      available: quantity,
    });

    return true;
  } catch (error) {
    console.error('Failed to sync inventory to Shopify:', error);
    return false;
  }
}

/**
 * Delete product from Shopify
 */
export async function deleteProductFromShopify(productId: string): Promise<boolean> {
  try {
    const shopify = await getShopifyClient();
    if (!shopify) return false;

    // Get product from our database
    const product = await prisma.product.findUnique({
      where: { id: productId },
    }) as ProductWithExternalIds;

    if (!product?.externalIds?.shopify) {
      console.log('Product does not have a Shopify ID, nothing to delete');
      return true;
    }

    // Delete from Shopify
    const shopifyProductId = product.externalIds.shopify;
    await shopify.product.delete(parseInt(shopifyProductId));

    return true;
  } catch (error) {
    console.error('Failed to delete product from Shopify:', error);
    return false;
  }
}

/**
 * Sync all products to Shopify
 */

/**
 * Import all products from Shopify to our database
 */
export async function importProductsFromShopify(): Promise<{
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  updated: number;
}> {
  try {
    // Initialize client
    const shopify = await getShopifyClient();
    if (!shopify) {
      return { success: false, total: 0, imported: 0, failed: 0, updated: 0 };
    }

    // Get all products from Shopify
    const params = { limit: 50 };
    const shopifyProducts = await shopify.product.list(params);
    
    let imported = 0;
    let failed = 0;
    let updated = 0;
    
    // Process each Shopify product
    for (const shopifyProduct of shopifyProducts) {
      try {
        const shopifyId = shopifyProduct.id.toString();
        
        // For MongoDB, fetch all products and filter manually
        // This avoids the issues with Prisma JSON filtering
        const products = await prisma.product.findMany();
        
        // Find product with matching Shopify ID in the externalIds JSON field
        const existingProduct = products.find(product => {
          // Check if externalIds exists and has a shopify property
          if (!product.externalIds) return false;
          
          try {
            // Parse the JSON if it's stored as a string
            const exIds = typeof product.externalIds === 'string' 
              ? JSON.parse(product.externalIds) 
              : product.externalIds;
              
            // Check if shopify ID matches
            return exIds.shopify === shopifyId;
          } catch (e) {
            return false;
          }
        });
        
        // Get or create product type
        let productTypeId = '';
        const productType = await prisma.productType.findFirst({
          where: {
            name: shopifyProduct.product_type || 'General'
          }
        });

        if (productType) {
          productTypeId = productType.id;
        } else {
          // Create new product type if it doesn't exist
          const newProductType = await prisma.productType.create({
            data: {
              name: shopifyProduct.product_type || 'General',
              description: `Imported from Shopify: ${shopifyProduct.product_type || 'General'}`
            }
          });
          productTypeId = newProductType.id;
        }
        
        // Get inventory data for this product
        let stockCount = 0;
        try {
          // Inventory is stored at the variant level in Shopify
          const inventoryItemId = shopifyProduct.variants[0]?.inventory_item_id;
          if (inventoryItemId) {
            // Get inventory level for this item
            const inventoryLevels = await shopify.inventoryLevel.list({ inventory_item_ids: inventoryItemId });
            if (inventoryLevels.length > 0) {
              stockCount = inventoryLevels[0].available || 0;
            }
          }
        } catch (inventoryError) {
          console.error(`Failed to get inventory for product ${shopifyProduct.id}:`, inventoryError);
          // Continue with default stock count of 0
        }

        if (existingProduct) {
          // Update existing product with new Shopify data
          // Create externalIds object with the Shopify ID
          const externalIds = { shopify: shopifyId };
          
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: shopifyProduct.title,
              description: shopifyProduct.body_html,
              price: parseFloat(shopifyProduct.variants[0]?.price || '0'),
              stockCount: stockCount,
              barcode: shopifyProduct.variants[0]?.barcode || null,
              // Use as any to bypass TypeScript checking for custom fields
              externalIds: externalIds as any
            }
          });
          updated++;
        } else {
          // Create new product with Shopify data
          // Create externalIds object with the Shopify ID
          const externalIds = { shopify: shopifyId };
          
          // Check if product with this barcode already exists
          const barcode = shopifyProduct.variants[0]?.barcode || null;
          let uniqueBarcode = barcode;
          
          // If barcode exists, make sure it's unique by checking database
          if (barcode) {
            const existingProduct = await prisma.product.findUnique({
              where: { barcode: barcode }
            });
            
            if (existingProduct) {
              // If barcode exists, modify it to make it unique by appending the Shopify ID
              uniqueBarcode = `${barcode}-${shopifyId}`;
            }
          } else {
            // If no barcode, generate one with Shopify ID to maintain uniqueness
            uniqueBarcode = `shopify-${shopifyId}`;
          }
          
          await prisma.product.create({
            data: {
              name: shopifyProduct.title,
              description: shopifyProduct.body_html,
              price: parseFloat(shopifyProduct.variants[0]?.price || '0'),
              stockCount: stockCount,
              barcode: uniqueBarcode,
              productTypeId: productTypeId,
              imageUrl: shopifyProduct.image?.src || null,
              // Use as any to bypass TypeScript checking for custom fields
              externalIds: externalIds as any
            }
          });
          imported++;
        }
      } catch (productError) {
        console.error(`Failed to import product ${shopifyProduct.id}:`, productError);
        failed++;
      }
    }

    return {
      success: true,
      total: shopifyProducts.length,
      imported,
      updated,
      failed
    };
  } catch (error) {
    console.error('Failed to import products from Shopify:', error);
    return { success: false, total: 0, imported: 0, failed: 0, updated: 0 };
  }
}

export async function syncAllProductsToShopify(): Promise<{ 
  success: boolean; 
  total: number; 
  synced: number; 
  failed: number; 
}> {
  try {
    const shopify = await getShopifyClient();
    if (!shopify) return { success: false, total: 0, synced: 0, failed: 0 };

    // Get all products from our database
    const products = await prisma.product.findMany({
      include: {
        productType: true,
        sku: true,
      },
    }) as ProductWithExternalIds[];

    let synced = 0;
    let failed = 0;

    // Sync each product
    for (const product of products) {
      const success = await syncProductToShopify(product);
      if (success) {
        synced++;
      } else {
        failed++;
      }
    }

    return {
      success: synced > 0,
      total: products.length,
      synced,
      failed,
    };
  } catch (error) {
    console.error('Failed to sync all products to Shopify:', error);
    return { success: false, total: 0, synced: 0, failed: 0 };
  }
}
