import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { User } from '@/types';
import { getShopifySettings, syncInventoryToShopify } from '@/services/shopifyIntegration';

// POST update stock count
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has appropriate permissions
    const user = session.user as User;
    if (user.role !== 'admin' && user.role !== 'user') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const data = await req.json();
    const { productId, quantity, operation } = data;
    
    if (!productId || quantity === undefined || !operation) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Find the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate new stock count based on operation
    let newStockCount = product.stockCount;
    
    switch (operation) {
      case 'set':
        // Set to specific value
        newStockCount = quantity;
        break;
      case 'add':
        // Add to current stock
        newStockCount = product.stockCount + quantity;
        break;
      case 'subtract':
        // Subtract from current stock (don't go below 0)
        newStockCount = Math.max(0, product.stockCount - quantity);
        break;
      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    // Update the product stock count
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { stockCount: newStockCount },
    });

    // If Shopify integration is enabled, sync the inventory update
    try {
      const shopifySettings = await getShopifySettings();
      if (shopifySettings?.isEnabled) {
        await syncInventoryToShopify(productId, newStockCount);
      }
    } catch (error) {
      console.error('Failed to sync inventory to Shopify:', error);
      // Don't block the response if Shopify sync fails
    }

    return NextResponse.json({ 
      success: true, 
      product: updatedProduct,
      previousStockCount: product.stockCount,
      newStockCount 
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}
