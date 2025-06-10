import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { User } from '@/types';

// GET all product types
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productTypes = await prisma.productType.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ productTypes });
  } catch (error) {
    console.error('Error fetching product types:', error);
    return NextResponse.json({ error: 'Failed to fetch product types' }, { status: 500 });
  }
}

// POST create new product type
export async function POST(req: NextRequest) {
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

    const { name, description } = await req.json();

    // Check if product type with same name already exists
    const existingType = await prisma.productType.findFirst({
      where: { name },
    });

    if (existingType) {
      return NextResponse.json(
        { error: 'Product type with this name already exists' },
        { status: 400 }
      );
    }

    // Create new product type
    const productType = await prisma.productType.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({ productType }, { status: 201 });
  } catch (error) {
    console.error('Error creating product type:', error);
    return NextResponse.json({ error: 'Failed to create product type' }, { status: 500 });
  }
}
