'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Product } from '@/types';
import Image from 'next/image';

// Define form schema using zod
const stockUpdateSchema = z.object({
  action: z.enum(['add', 'subtract', 'set']),
  quantity: z.number().int().min(0, { message: 'Quantity must be a non-negative integer' }),
  notes: z.string().optional()
});

// Define form data type from schema
type StockUpdateFormData = z.infer<typeof stockUpdateSchema>;

export default function ManageStockPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { status } = useSession();
  const { isAdmin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StockUpdateFormData>({
    resolver: zodResolver(stockUpdateSchema),
    defaultValues: {
      action: 'add',
      quantity: 0,
    }
  });
  
  const action = watch('action');
  const quantity = watch('quantity');
  
  // Preview the result based on current values
  const calculateNewStock = (): number => {
    if (!product) return 0;
    
    switch(action) {
      case 'add':
        return product.stockCount + quantity;
      case 'subtract':
        return Math.max(0, product.stockCount - quantity); // Prevent negative stock
      case 'set':
        return quantity;
      default:
        return product.stockCount;
    }
  };
  
  // Check authentication and admin role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard');
    }
  }, [status, router, isAdmin]);
  
  // Fetch product data
  useEffect(() => {
    if (status === 'authenticated' && isAdmin && productId) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          
          const response = await fetch(`/api/products/${productId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch product');
          }
          
          const data = await response.json();
          setProduct(data.product);
        } catch (error) {
          console.error('Failed to fetch product:', error);
          setError(error instanceof Error ? error.message : 'An error occurred while fetching the product');
        } finally {
          setLoading(false);
        }
      };
      
      fetchProduct();
    }
  }, [status, isAdmin, productId]);
  
  const onSubmit = async (data: StockUpdateFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      let newStockCount = product?.stockCount || 0;
      
      switch(data.action) {
        case 'add':
          newStockCount = (product?.stockCount || 0) + data.quantity;
          break;
        case 'subtract':
          newStockCount = Math.max(0, (product?.stockCount || 0) - data.quantity);
          break;
        case 'set':
          newStockCount = data.quantity;
          break;
      }
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockCount: newStockCount,
          stockAdjustmentNotes: data.notes,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update stock');
      }
      
      // Update local product data
      if (product) {
        setProduct({
          ...product,
          stockCount: newStockCount
        });
      }
      
      setSuccess(true);
      
      // Reset form after success (but don't redirect)
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Stock update error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while updating stock');
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
  
  if (status === 'authenticated' && !isAdmin) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-red-500">You do not have permission to access this page.</p>
        <Link href="/dashboard" className="mt-4 text-blue-500 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-red-500">Product not found</p>
        <Link href="/products" className="mt-4 text-blue-500 hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Manage Stock</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Update inventory levels for {product.name}
        </p>
      </div>
      
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        {/* Product Info */}
        <div className="flex items-center mb-6">
          {product.imageUrl && (
            <div className="flex-shrink-0 h-20 w-20 mr-4">
              <img
                className="h-20 w-20 object-cover rounded"
                src={product.imageUrl}
                alt={product.name}
              />
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500">
              Current Stock: <span className={`font-medium ${product.stockCount <= 10 ? 'text-red-600' : 'text-green-600'}`}>{product.stockCount}</span>
            </p>
            {product.barcode && (
              <p className="text-sm text-gray-500">Barcode: {product.barcode}</p>
            )}
          </div>
        </div>
        
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Stock updated successfully</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>New stock level: {product.stockCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stock Action
              </label>
              <div className="mt-1">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      id="add"
                      type="radio"
                      value="add"
                      {...register('action')}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="add" className="ml-3 block text-sm font-medium text-gray-700">
                      Add Stock
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="subtract"
                      type="radio"
                      value="subtract"
                      {...register('action')}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="subtract" className="ml-3 block text-sm font-medium text-gray-700">
                      Remove Stock
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="set"
                      type="radio"
                      value="set"
                      {...register('action')}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="set" className="ml-3 block text-sm font-medium text-gray-700">
                      Set Stock Level
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  id="quantity"
                  min="0"
                  {...register('quantity', { valueAsNumber: true })}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <div className="mt-1">
                <textarea
                  id="notes"
                  rows={3}
                  {...register('notes')}
                  placeholder="Reason for stock adjustment..."
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-700">Preview</h4>
              <div className="mt-2 text-sm">
                {action === 'add' && (
                  <p>Adding {quantity} units to current stock of {product.stockCount} will result in <strong>{calculateNewStock()}</strong> units.</p>
                )}
                {action === 'subtract' && (
                  <p>Removing {quantity} units from current stock of {product.stockCount} will result in <strong>{calculateNewStock()}</strong> units.</p>
                )}
                {action === 'set' && (
                  <p>Setting stock level to <strong>{quantity}</strong> units (current: {product.stockCount}).</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-end">
            <Link
              href={`/products/${productId}`}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
