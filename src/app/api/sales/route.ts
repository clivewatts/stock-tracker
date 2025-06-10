import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { getShopifySettings, syncProductToShopify } from '@/services/shopifyIntegration';
import { ProductWithExternalIds } from '@/types';

// GET all sales with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '50');
    
    // Date range filtering
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        saleDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    } else if (startDate) {
      dateFilter = {
        saleDate: {
          gte: new Date(startDate),
        },
      };
    } else if (endDate) {
      dateFilter = {
        saleDate: {
          lte: new Date(endDate),
        },
      };
    }

    // Get sales with filters
    const sales = await prisma.sale.findMany({
      where: dateFilter,
      include: {
        product: {
          include: {
            productType: true,
            sku: true,
          },
        },
      },
      skip,
      take,
      orderBy: { saleDate: 'desc' },
    });

    // Get total count for pagination
    const total = await prisma.sale.count({ where: dateFilter });

    // Calculate summary statistics
    const sumResult = await prisma.sale.aggregate({
      where: dateFilter,
      _sum: {
        quantity: true,
        totalPrice: true,
      },
    });

    // Prepare the summary
    const summary = {
      totalSales: total,
      totalQuantity: sumResult._sum.quantity || 0,
      totalRevenue: sumResult._sum.totalPrice || 0,
    };

    return NextResponse.json({ sales, total, summary });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

// POST create new sale
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, quantity } = await req.json();

    // Validate input
    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required. Quantity must be at least 1.' },
        { status: 400 }
      );
    }

    // Start transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get product details
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if enough stock is available
      if (product.stockCount < quantity) {
        throw new Error('Not enough stock available');
      }

      // Calculate total price
      const totalPrice = product.price * quantity;

      // Create sale record
      const sale = await tx.sale.create({
        data: {
          productId,
          quantity,
          totalPrice,
          saleDate: new Date(),
        },
        include: {
          product: true,
        },
      });

      // Update product stock count
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          stockCount: product.stockCount - quantity,
        },
        include: {
          productType: true,
          sku: true,
        },
      });

      return { sale, updatedProduct };
    });

    // After transaction completes, sync the product to Shopify to update inventory
    try {
      const shopifySettings = await getShopifySettings();
      if (shopifySettings?.isEnabled && result.updatedProduct) {
        await syncProductToShopify(result.updatedProduct as ProductWithExternalIds);
      }
    } catch (syncError) {
      console.error('Error syncing product to Shopify after sale:', syncError);
      // Don't block the response if Shopify sync fails
    }

    return NextResponse.json({ sale: result.sale }, { status: 201 });
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    console.error('Error creating sale:', errorObj);
    return NextResponse.json(
      { error: errorObj.message || 'Failed to create sale' },
      { status: errorObj.message === 'Not enough stock available' ? 400 : 500 }
    );
  }
}
