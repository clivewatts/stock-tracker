'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalSalesToday: number;
  revenueTodayFormatted: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { status } = useSession();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch dashboard stats
  useEffect(() => {
    if (status === 'authenticated') {
      const fetchStats = async () => {
        try {
          // Get current date for today's sales
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Fetch total products
          const productsRes = await fetch('/api/products?skip=0&take=1');
          const productsData = await productsRes.json();
          
          // Fetch products with low stock (less than 10)
          const lowStockRes = await fetch('/api/products?lowStock=true');
          const lowStockData = await lowStockRes.json();
          
          // Fetch today's sales
          const salesRes = await fetch(`/api/sales?startDate=${today.toISOString()}&endDate=${new Date().toISOString()}`);
          const salesData = await salesRes.json();
          
          setStats({
            totalProducts: productsData.total || 0,
            lowStockProducts: lowStockData.products?.length || 0,
            totalSalesToday: salesData.summary?.totalSales || 0,
            revenueTodayFormatted: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(salesData.summary?.totalRevenue || 0)
          });
        } catch (error) {
          console.error('Failed to fetch dashboard stats:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchStats();
    }
  }, [status]);
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Dashboard</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Welcome back {user?.name}! Here's your stock and sales overview.
        </p>
      </div>
      
      {/* Stats Overview */}
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Products */}
            <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Products
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stats?.totalProducts || '0'}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-blue-100 px-5 py-3">
                <div className="text-sm">
                  <Link href="/products" className="font-medium text-blue-700 hover:text-blue-900">
                    View all products
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Low Stock Products */}
            <div className="bg-yellow-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Low Stock Products
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stats?.lowStockProducts || '0'}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-100 px-5 py-3">
                <div className="text-sm">
                  <Link href="/products?filter=lowStock" className="font-medium text-yellow-700 hover:text-yellow-900">
                    View low stock items
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Today's Sales */}
            <div className="bg-green-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Today's Sales
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stats?.totalSalesToday || '0'}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-green-100 px-5 py-3">
                <div className="text-sm">
                  <Link href="/sales" className="font-medium text-green-700 hover:text-green-900">
                    View all sales
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Today's Revenue */}
            <div className="bg-indigo-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Today's Revenue
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stats?.revenueTodayFormatted || '$0.00'}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-indigo-100 px-5 py-3">
                <div className="text-sm">
                  <Link href="/sales/daily" className="font-medium text-indigo-700 hover:text-indigo-900">
                    View daily breakdown
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Link 
                href="/sales/create" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Record New Sale
              </Link>
            </div>
            {user?.role === 'admin' && (
              <div>
                <Link 
                  href="/admin/products/create" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Add New Product
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
