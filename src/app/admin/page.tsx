'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AdminPage() {
  const router = useRouter();
  const { status } = useSession();
  const { isAdmin } = useAuth();
  
  // Check authentication and admin role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard');
    }
  }, [status, router, isAdmin]);
  
  if (status === 'loading' || !isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Admin Dashboard</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage users, products, and system settings
        </p>
      </div>
      
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* User Management */}
          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Add, edit, and manage system users
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Manage user accounts and permissions for the stock tracking system.
                </p>
                <div>
                  <Link
                    href="/admin/users"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    View All Users
                  </Link>
                </div>
                <div>
                  <Link
                    href="/admin/users/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    Add New User
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Product Management */}
          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Product Management</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage products, SKUs, and inventory
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Add, edit, and manage products in your inventory.
                </p>
                <div>
                  <Link
                    href="/products"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    View All Products
                  </Link>
                </div>
                <div>
                  <Link
                    href="/admin/products/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    Add New Product
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* System Settings */}
          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">System Settings</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Configure system parameters and data
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Manage product types, SKUs, and other system settings.
                </p>
                <div>
                  <Link
                    href="/admin/product-types"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Product Types
                  </Link>
                </div>
                <div>
                  <Link
                    href="/admin/skus"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    SKU Management
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/sales/daily"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            View Sales Reports
          </Link>
          <Link
            href="/sales/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            Record New Sale
          </Link>
        </div>
      </div>
    </div>
  );
}
