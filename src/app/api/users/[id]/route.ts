import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';

// GET handler - get user by ID (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const userId = params.id;
    
    // Get user by ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ message: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT/PATCH handler - update user (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const userId = params.id;
    
    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Parse request body
    const data = await req.json();
    const { name, email, password, role } = data;
    
    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (name) updateData.name = name;
    if (email && email !== existingUser.email) {
      // Check if email is already taken
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      
      if (emailExists && emailExists.id !== userId) {
        return NextResponse.json({ message: 'Email is already taken' }, { status: 400 });
      }
      
      updateData.email = email;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (role) updateData.role = role;
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE handler - delete user (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const userId = params.id;
    
    // Prevent self-deletion
    if (currentUser.id === userId) {
      return NextResponse.json({ message: 'Cannot delete your own account' }, { status: 400 });
    }
    
    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
  }
}
