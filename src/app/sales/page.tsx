'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sale } from '@/types';
import Link from 'next/link';
import { format, subDays, parseISO, startOfDay, endOfDay } from 'date-fns';

// Component that uses useSearchParams needs to be wrapped in Suspense
function SalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  const ITEMS_PER_PAGE = 15;
  
  const [startDate, setStartDate] = useState<string>(() => {
    const paramDate = searchParams.get('startDate');
    return paramDate || format(subDays(new Date(), 7), 'yyyy-MM-dd');
  });
  
  const [endDate, setEndDate] = useState<string>(() => {
    const paramDate = searchParams.get('endDate');
    return paramDate || format(new Date(), 'yyyy-MM-dd');
  });
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch sales
  useEffect(() => {
    if (status === 'authenticated') {
      fetchSales();
    }
  }, [status, currentPage, startDate, endDate]);
  
  const fetchSales = async () => {
    try {
      setLoading(true);
      
      const skip = (currentPage - 1) * ITEMS_PER_PAGE;
      const formattedStartDate = startOfDay(parseISO(startDate)).toISOString();
      const formattedEndDate = endOfDay(parseISO(endDate)).toISOString();
      
      const url = `/api/sales?skip=${skip}&take=${ITEMS_PER_PAGE}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      setSales(data.sales || []);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
      setTotalSales(data.summary?.totalSales || 0);
      setTotalRevenue(data.summary?.totalRevenue || 0);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    
    router.push(`/sales?${params.toString()}`);
    fetchSales();
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center">
          <div>
            <h2 className="text-lg leading-6 font-medium text-gray-900">Sales History</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              View and filter sales records
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Link
              href="/sales/daily"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Daily Reports
            </Link>
            <Link
              href="/sales/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Record New Sale
            </Link>
          </div>
        </div>
        
        {/* Date Filter */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <form onSubmit={handleDateFilterSubmit} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 sm:w-auto">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                From Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex-1 sm:w-auto">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                To Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Filter
              </button>
            </div>
          </form>
        </div>
        
        {/* Summary Stats */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="bg-blue-50 px-4 py-5 sm:p-6 shadow rounded-lg overflow-hidden">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalSales}</dd>
            </div>
            <div className="bg-green-50 px-4 py-5 sm:p-6 shadow rounded-lg overflow-hidden">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{formatCurrency(totalRevenue)}</dd>
            </div>
          </dl>
        </div>
      </div>
      
      {/* Sales List */}
      {sales.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">No sales found for the selected date range</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(sale.saleDate), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            <Link href={`/products/${sale.productId}`} className="hover:text-blue-600">
                              {sale.productName}
                            </Link>
                          </div>
                          {sale.productBarcode && (
                            <div className="text-sm text-gray-500">
                              {sale.productBarcode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(sale.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(sale.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{sales.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalSales)}</span> of{' '}
                    <span className="font-medium">{totalSales}</span> sales
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNumber = currentPage <= 3 
                        ? i + 1 
                        : currentPage + i - 2;
                      
                      if (pageNumber > totalPages || pageNumber < 1) return null;
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNumber
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Main component that wraps the content in a Suspense boundary
export default function SalesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[70vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>}>
      <SalesContent />
    </Suspense>
  );
}
