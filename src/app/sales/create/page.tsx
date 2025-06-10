'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatCurrency } from '@/utils/currency';
import { Product } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';

// Define form schema using zod
const saleSchema = z.object({
  productId: z.string().min(1, { message: 'Product is required' }),
  quantity: z.number().min(1, { message: 'Quantity must be at least 1' }),
});

// Define form data type from schema
type SaleFormData = z.infer<typeof saleSchema>;

// Component that uses useSearchParams wrapped in Suspense
function CreateSaleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      quantity: 1,
    },
  });
  
  const quantity = watch('quantity');
  const productId = watch('productId');
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch products
  useEffect(() => {
    if (status === 'authenticated') {
      const fetchProducts = async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/products');
          const data = await response.json();
          setProducts(data.products || []);
          setFilteredProducts(data.products || []);
          
          // Check if there's a productId in query params
          const preSelectedProductId = searchParams.get('productId');
          if (preSelectedProductId) {
            const selectedProduct = data.products.find((p: Product) => p.id === preSelectedProductId);
            if (selectedProduct) {
              setSelectedProduct(selectedProduct);
              setValue('productId', selectedProduct.id);
            }
          }
        } catch (error) {
          console.error('Failed to fetch products:', error);
          setError('Failed to fetch products. Please try again later.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchProducts();
    }
  }, [status, setValue, searchParams]);
  
  // Update filtered products when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) => {
        const term = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(term) ||
          product.description?.toLowerCase().includes(term) ||
          product.barcode?.toLowerCase().includes(term)
        );
      });
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);
  
  // Update selected product when productId changes
  useEffect(() => {
    if (productId) {
      const product = products.find((p) => p.id === productId);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [productId, products]);
  
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setValue('productId', product.id);
    setSearchTerm('');
  };
  
  const calculateTotal = () => {
    if (selectedProduct && quantity) {
      const totalAmount = selectedProduct.price * quantity;
      return formatCurrency(totalAmount, false); // false to get only the number without currency symbol
    }
    return '0.00';
  };
  
  const onSubmit = async (data: SaleFormData) => {
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }
    
    if (selectedProduct.stockCount < data.quantity) {
      setError(`Not enough stock. Only ${selectedProduct.stockCount} available.`);
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: selectedProduct.price,
          totalPrice: selectedProduct.price * data.quantity,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record sale');
      }
      
      setSuccess(true);
      reset();
      setSelectedProduct(null);
      
      // Refresh products list to get updated stock
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      setProducts(productsData.products || []);
      
      // Auto-redirect after a delay
      setTimeout(() => {
        router.push('/sales');
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error('Sale submission error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while recording the sale');
    } finally {
      setSubmitting(false);
    }
  };
  
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
        <h2 className="text-lg leading-6 font-medium text-gray-900">Record New Sale</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Select a product and enter the quantity to record a sale
        </p>
      </div>
      
      {success ? (
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Sale recorded successfully</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Redirecting to sales page...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Product Search */}
              <div className="sm:col-span-6">
                <label htmlFor="product-search" className="block text-sm font-medium text-gray-700">
                  Search Products
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="product-search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, description, or barcode"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              {/* Product Selection */}
              <div className="sm:col-span-6">
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700">Select Product</legend>
                  <div className="mt-1 bg-white rounded-md shadow-sm -space-y-px">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No products found</div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
                        {filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`relative px-4 py-2 flex cursor-pointer hover:bg-gray-50 ${
                              selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="selected-product"
                                value={product.id}
                                checked={selectedProduct?.id === product.id}
                                onChange={() => handleProductSelect(product)}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                              />
                              <div className="ml-3 flex items-center">
                                {product.imageUrl && (
                                  <div className="flex-shrink-0 h-10 w-10 relative mr-3">
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      fill
                                      className="object-cover rounded-md"
                                    />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {formatCurrency(product.price)} - Stock: {product.stockCount}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="hidden" {...register('productId')} />
                  {errors.productId && (
                    <p className="mt-2 text-sm text-red-600">{errors.productId.message}</p>
                  )}
                </fieldset>
              </div>
              
              {/* Selected Product Details */}
              {selectedProduct && (
                <div className="sm:col-span-6 border rounded-md p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700">Selected Product:</h3>
                  <div className="mt-2 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold">{selectedProduct.name}</p>
                      <p className="text-sm text-gray-500">Price: {formatCurrency(selectedProduct.price)}</p>
                      <p className="text-sm text-gray-500">Available Stock: {selectedProduct.stockCount}</p>
                    </div>
                    {selectedProduct.imageUrl && (
                      <div className="h-16 w-16 relative">
                        <Image
                          src={selectedProduct.imageUrl}
                          alt={selectedProduct.name}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Quantity Input */}
              <div className="sm:col-span-2">
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    max={selectedProduct?.stockCount || 100}
                    {...register('quantity', { valueAsNumber: true })}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                {errors.quantity && (
                  <p className="mt-2 text-sm text-red-600">{errors.quantity.message}</p>
                )}
              </div>
              
              {/* Total Price */}
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700">
                  Total Price
                </label>
                <div className="mt-1">
                  <div className="shadow-sm block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 px-3 py-2">
                    ${calculateTotal()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedProduct}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Record Sale'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Main component that wraps the content in a Suspense boundary
export default function CreateSalePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[70vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>}>
      <CreateSaleContent />
    </Suspense>
  );
}
