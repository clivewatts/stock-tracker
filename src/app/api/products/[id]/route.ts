import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { User, ProductWithExternalIds } from '@/types';
import { unlink } from 'fs/promises';
import path from 'path';
import { getShopifySettings, syncProductToShopify, deleteProductFromShopify } from '@/services/shopifyIntegration';

// GET product by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = (await params);
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productType: true,
        sku: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT update product by ID
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = session.user as User;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = (await params);
    
    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
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
    // Check if we should sync to Shopify - default to false
    const syncToShopify = formData.get('syncToShopify') === 'true';
    
    // Handle image update if present
    const imageFile = formData.get('image') as File | null;
    let imageUrl = existingProduct.imageUrl;
    
    if (imageFile) {
      // Delete old image if exists
      if (existingProduct.imageUrl) {
        try {
          const oldImagePath = path.join(
            process.env.UPLOAD_DIRECTORY || './public/uploads', 
            path.basename(existingProduct.imageUrl)
          );
          await unlink(oldImagePath);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
      
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename with uuid
      const filename = `${require('uuid').v4()}-${imageFile.name.replace(/\s/g, '_')}`;
      const uploadDir = process.env.UPLOAD_DIRECTORY || './public/uploads';
      const imagePath = path.join(uploadDir, filename);
      
      // Save the file
      await require('fs/promises').writeFile(imagePath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    // Update product in database
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        barcode,
        imageUrl,
        price,
        stockCount,
        productTypeId,
        skuId,
      },
      include: {
        productType: true,
        sku: true,
      },
    });
    
    // Only sync to Shopify if explicitly requested
    if (syncToShopify) {
      try {
        const shopifySettings = await getShopifySettings();
        if (shopifySettings?.isEnabled) {
          await syncProductToShopify(updatedProduct as ProductWithExternalIds);
        }
      } catch (error) {
        console.error('Failed to sync updated product to Shopify:', error);
        // Don't block the response if Shopify sync fails
      }
    }

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE product by ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = session.user as User;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = (await params);
    
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete image if exists
    if (product.imageUrl) {
      try {
        const imagePath = path.join(
          process.env.UPLOAD_DIRECTORY || './public/uploads',
          path.basename(product.imageUrl)
        );
        await unlink(imagePath);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    // If Shopify integration is enabled, delete the product from Shopify first
    try {
      const shopifySettings = await getShopifySettings();
      if (shopifySettings?.isEnabled) {
        await deleteProductFromShopify(id);
      }
    } catch (error) {
      console.error('Failed to delete product from Shopify:', error);
      // Don't block the deletion if Shopify sync fails
    }
    
    // Delete the product
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
