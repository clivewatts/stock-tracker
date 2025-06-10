import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifySettings } from '@/services/shopifyIntegration';
import crypto from 'crypto';

// Handle Shopify webhooks (product updates, inventory updates, etc.)
export async function POST(req: NextRequest) {
  try {
    // Get Shopify settings to verify webhook
    const shopifySettings = await getShopifySettings();
    if (!shopifySettings || !shopifySettings.isEnabled) {
      return NextResponse.json({ error: 'Shopify integration not enabled' }, { status: 400 });
    }

    // Verify webhook signature
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const shopifyDomain = req.headers.get('x-shopify-shop-domain');
    
    if (!hmacHeader || !shopifyDomain) {
      console.error('Missing required Shopify webhook headers');
      return NextResponse.json({ error: 'Invalid webhook request' }, { status: 401 });
    }

    // Get the request body as text for HMAC verification
    const body = await req.text();
    
    // Get shared secret from settings
    const settings = shopifySettings.settings as any;
    const secret = settings.apiSecret;

    // Verify signature
    const hash = crypto.createHmac('sha256', secret).update(body).digest('base64');
    
    if (hash !== hmacHeader) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // Parse the body again as JSON
    const data = JSON.parse(body);
    const topic = req.headers.get('x-shopify-topic');

    // Handle different webhook topics
    switch (topic) {
      case 'products/update':
        await handleProductUpdate(data);
        break;
      case 'products/delete':
        await handleProductDelete(data);
        break;
      case 'inventory_levels/update':
        await handleInventoryUpdate(data);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    // Always return a 200 response to acknowledge receipt
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Shopify webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}

// Handle product updates from Shopify
async function handleProductUpdate(data: any) {
  try {
    const shopifyProductId = data.id.toString();
    
    // Find the product in our system by Shopify ID
    const product = await prisma.product.findFirst({
      where: {
        externalIds: {
          path: ['shopify'],
          equals: shopifyProductId
        }
      }
    });

    if (!product) {
      // This is a new product we don't have yet
      // You could create it here, or ignore it
      console.log(`Product with Shopify ID ${shopifyProductId} not found in our system`);
      return;
    }

    // Update our product with data from Shopify
    await prisma.product.update({
      where: { id: product.id },
      data: {
        name: data.title,
        description: data.body_html,
        // Handle other fields as needed
        // Only update fields you want to sync from Shopify
      }
    });

    console.log(`Successfully updated product ${product.id} from Shopify webhook`);
  } catch (error) {
    console.error('Error handling product update webhook:', error);
  }
}

// Handle product deletions from Shopify
async function handleProductDelete(data: any) {
  try {
    const shopifyProductId = data.id.toString();
    
    // Find the product in our system by Shopify ID
    const product = await prisma.product.findFirst({
      where: {
        externalIds: {
          path: ['shopify'],
          equals: shopifyProductId
        }
      }
    });

    if (!product) {
      console.log(`Product with Shopify ID ${shopifyProductId} not found in our system`);
      return;
    }

    // Remove the Shopify ID from our product, but don't delete the product
    await prisma.product.update({
      where: { id: product.id },
      data: {
        externalIds: {}
      }
    });

    console.log(`Removed Shopify ID from product ${product.id} after deletion in Shopify`);
  } catch (error) {
    console.error('Error handling product delete webhook:', error);
  }
}

// Handle inventory updates from Shopify
async function handleInventoryUpdate(data: any) {
  try {
    // This requires looking up the inventory item to product mapping
    // which would typically be stored when creating/syncing products
    console.log('Received inventory update webhook');
    
    // Implementation would look up product by inventory_item_id and update stock
    // This is a simplified version
    
    // For now, log the data
    console.log('Inventory update data:', data);
  } catch (error) {
    console.error('Error handling inventory update webhook:', error);
  }
}
