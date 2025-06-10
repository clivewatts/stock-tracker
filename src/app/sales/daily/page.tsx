'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';

interface DailySalesSummary {
  date: string;
  totalSales: number;
  totalRevenue: number;
  formattedDate: string;
  formattedRevenue: string;
}

export default function DailySalesReportPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [dailySummaries, setDailySummaries] = useState<DailySalesSummary[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days by default
    return format(date, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch daily sales data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchDailySales();
    }
  }, [status, startDate, endDate]);
  
  const fetchDailySales = async () => {
    try {
      setLoading(true);
      
      const formattedStartDate = startOfDay(parseISO(startDate)).toISOString();
      const formattedEndDate = endOfDay(parseISO(endDate)).toISOString();
      
      const response = await fetch(`/api/sales/daily?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch daily sales data');
      }
      
      const data = await response.json();
      
      // Process and format the data
      const formattedSummaries = (data.dailySummaries || []).map((summary: any) => {
        const date = new Date(summary.date);
        return {
          ...summary,
          formattedDate: format(date, 'yyyy-MM-dd'),
          formattedRevenue: formatCurrency(summary.totalRevenue),
        };
      });
      
      setDailySummaries(formattedSummaries);
      setTotalRevenue(data.totalRevenue || 0);
      setTotalSales(data.totalSales || 0);
    } catch (error) {
      console.error('Failed to fetch daily sales:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDailySales();
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
            <h2 className="text-lg leading-6 font-medium text-gray-900">Daily Sales Report</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              View daily sales totals and revenue
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              href="/sales"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Sales
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
                Update Report
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
      
      {/* Daily Sales Table */}
      {dailySummaries.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">No sales data found for the selected date range</p>
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
                    Total Sales
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailySummaries.map((summary, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.formattedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {summary.totalSales}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.formattedRevenue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/sales?startDate=${summary.formattedDate}&endDate=${summary.formattedDate}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Print Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
          Print Report
        </button>
      </div>
      
      {/* Print-specific styles, hidden on screen but applied when printing */}
      <style jsx global>{`
        @media print {
          nav, button, a {
            display: none !important;
          }
          .shadow {
            box-shadow: none !important;
          }
          body {
            font-size: 12pt;
          }
          h2 {
            font-size: 14pt;
            margin-bottom: 10pt;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
    </>
  );
}
