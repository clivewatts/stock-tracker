import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { User } from '@/types';

// GET all SKUs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const skus = await prisma.sKU.findMany({
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ skus });
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    return NextResponse.json({ error: 'Failed to fetch SKUs' }, { status: 500 });
  }
}

// POST create new SKU
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

    const { code, description } = await req.json();

    // Check if SKU with same code already exists
    const existingSku = await prisma.sKU.findFirst({
      where: { code },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: 'SKU with this code already exists' },
        { status: 400 }
      );
    }

    // Create new SKU
    const sku = await prisma.sKU.create({
      data: {
        code,
        description,
      },
    });

    return NextResponse.json({ sku }, { status: 201 });
  } catch (error) {
    console.error('Error creating SKU:', error);
    return NextResponse.json({ error: 'Failed to create SKU' }, { status: 500 });
  }
}
