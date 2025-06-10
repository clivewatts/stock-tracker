'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatCurrency } from '@/utils/currency';
import Image from 'next/image';
import { Product } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ProductTypesSKUsModal from '@/components/ProductTypesSKUsModal';

// Create a wrapper component that uses searchParams
function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState(searchParams.get('filter') || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const ITEMS_PER_PAGE = 10;
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch products
  // Define fetchProducts with useCallback to avoid dependency issues
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query string with pagination and search parameters
      const skip = (currentPage - 1) * ITEMS_PER_PAGE;
      let queryString = `skip=${skip}&take=${ITEMS_PER_PAGE}`;
      
      if (searchTerm) {
        queryString += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      if (filter) {
        queryString += `&filter=${encodeURIComponent(filter)}`;
      }
      
      const response = await fetch(`/api/products?${queryString}`);
      const data = await response.json();
      
      setProducts(data.products || []);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filter, ITEMS_PER_PAGE]);
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchProducts();
    }
  }, [status, fetchProducts]);
  

  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (filter) params.append('filter', filter);
    router.push(`/products?${params.toString()}`);
    fetchProducts();
  };
  
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (newFilter) params.append('filter', newFilter);
    router.push(`/products?${params.toString()}`);
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
            <h2 className="text-lg leading-6 font-medium text-gray-900">Products</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Browse and search available products
            </p>
          </div>
          <div className="mt-4 sm:mt-0 space-x-2">
            {isAdmin && (
              <>
                <Link
                  href="/admin/products/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-500 hover:bg-pink-600"
                >
                  Add New Product
                </Link>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-500 hover:bg-pink-600"
                >
                  Manage Types & SKUs
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-500 hover:bg-pink-600"
                >
                  Search
                </button>
              </form>
            </div>
            <div className="sm:w-48">
              <select
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Products</option>
                <option value="lowStock">Low Stock</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Products List */}
      {products.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">No products found</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <ul className="divide-y divide-gray-200">
            {products.map((product) => (
              <li key={product.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 h-16 w-16 relative">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center">
                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      <Link
                      href={`/products/${product.id}`}
                      className="text-pink-600 hover:text-pink-800"
                    >
                      {product.name}
                    </Link>
                    </p>
                    <div 
                      className="text-sm text-gray-500 line-clamp-2 product-description-preview"
                      dangerouslySetInnerHTML={{ __html: product.description || '' }} 
                    />
                    <div className="mt-1">
                      <span className="text-sm text-gray-700 mr-4">
                        Price: {formatCurrency(product.price)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.stockCount <= 5 ? 'bg-red-100 text-red-800' : 'bg-pink-100 text-pink-800'
                      }`}>
                        Stock: {product.stockCount}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Link
                      href={`/sales/create?productId=${product.id}`}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm rounded-md shadow-sm text-white bg-pink-500 hover:bg-pink-600"
                    >
                      Sell
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
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
                    Showing <span className="font-medium">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, products.length)}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, products.length)}</span> of{' '}
                    <span className="font-medium">{products.length}</span> products
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
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === i + 1
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
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
      {isAdmin && isModalOpen && (
        <ProductTypesSKUsModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}

// Main component that wraps the content in a Suspense boundary
export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[70vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>}>
      <ProductsContent />
    </Suspense>
  );
}
