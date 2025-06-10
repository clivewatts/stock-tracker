import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { User, ProductWithExternalIds } from '@/types';
import { getShopifySettings, syncProductToShopify } from '@/services/shopifyIntegration';

// GET all products
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');
    const searchTerm = url.searchParams.get('search') || '';

    // Search condition
    const where = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' as const } },
            { description: { contains: searchTerm, mode: 'insensitive' as const } },
            { barcode: { contains: searchTerm, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      include: {
        productType: true,
        sku: true,
      },
      skip,
      take,
      orderBy: { name: 'asc' },
    });

    // Get total count for pagination
    const total = await prisma.product.count({ where });

    return NextResponse.json({ products, total });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST create new product
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const user = session.user as User;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const formData = await req.formData();
    
    // Extract form fields
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;
    const barcode = formData.get('barcode') as string || null;
    const price = parseFloat(formData.get('price') as string);
    const stockCount = parseInt(formData.get('stockCount') as string);
    const productTypeId = formData.get('productTypeId') as string;
    const skuId = (formData.get('skuId') as string) || null;
    
    // Handle image upload if present
    const imageFile = formData.get('image') as File | null;
    let imageUrl = null;
    
    if (imageFile) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create upload directory if it doesn't exist
      const uploadDir = process.env.UPLOAD_DIRECTORY || './public/uploads';
      await mkdir(uploadDir, { recursive: true });
      
      // Generate unique filename
      const filename = `${uuidv4()}-${imageFile.name.replace(/\s/g, '_')}`;
      const imagePath = join(uploadDir, filename);
      
      // Save the file
      await writeFile(imagePath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    // Create new product in database
    const product = await prisma.product.create({
      data: {
        name,
        description,
        barcode,
        imageUrl,
        price,
        stockCount,
        productTypeId,
        skuId,
        externalIds: {}, // Initialize empty external IDs
      },
      include: {
        productType: true,
        sku: true,
      },
    });

    // If Shopify integration is enabled, sync the product
    try {
      const shopifySettings = await getShopifySettings();
      if (shopifySettings?.isEnabled) {
        await syncProductToShopify(product as ProductWithExternalIds);
      }
    } catch (error) {
      console.error('Failed to sync product to Shopify:', error);
      // Don't block the response if Shopify sync fails
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
