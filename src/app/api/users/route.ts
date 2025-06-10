import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';

// GET handler - get all users (admin only)
export async function GET(req: NextRequest) {
  try {
    // Extract query parameters (useful for filtering/searching users)
    const searchQuery = req.nextUrl.searchParams.get('search') || '';
    const roleFilter = req.nextUrl.searchParams.get('role');
    
    // Build where clause for prisma
    const whereClause: Record<string, unknown> = {};
    
    // Add search filter if provided
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }
    
    // Add role filter if provided
    if (roleFilter && ['admin', 'user'].includes(roleFilter)) {
      whereClause.role = roleFilter;
    }
    // Check authentication and authorization
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get current user to check admin status
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get users with filtering applied
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST handler - create new user (admin only)
export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get current user to check admin status
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Parse request body
    const data = await req.json();
    const { name, email, password, role } = data;
    
    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, and password are required' }, { status: 400 });
    }
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'user', // Default to 'user' if role is not specified
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
  }
}
