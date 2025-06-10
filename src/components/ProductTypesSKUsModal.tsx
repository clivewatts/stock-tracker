'use client';

import { useState, useEffect } from 'react';
import { ProductType, SKU } from '@/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define form schemas
const productTypeSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  description: z.string().optional(),
});

const skuSchema = z.object({
  code: z.string().min(2, { message: 'Code must be at least 2 characters' }),
  description: z.string().optional(),
});

type ProductTypeFormData = z.infer<typeof productTypeSchema>;
type SKUFormData = z.infer<typeof skuSchema>;

interface ProductTypesSKUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductTypesSKUsModal({ isOpen, onClose }: ProductTypesSKUsModalProps) {
  const [activeTab, setActiveTab] = useState<'types' | 'skus'>('types');
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const productTypeForm = useForm<ProductTypeFormData>({
    resolver: zodResolver(productTypeSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const skuForm = useForm<SKUFormData>({
    resolver: zodResolver(skuSchema),
    defaultValues: {
      code: '',
      description: '',
    },
  });

  // Fetch product types and SKUs on component mount
  useEffect(() => {
    if (isOpen) {
      fetchProductTypes();
      fetchSKUs();
    }
  }, [isOpen]);

  const fetchProductTypes = async () => {
    try {
      const response = await fetch('/api/product-types');
      if (!response.ok) {
        throw new Error('Failed to fetch product types');
      }
      const data = await response.json();
      // Ensure we're getting an array from the API response
      setProductTypes(Array.isArray(data) ? data : data.productTypes || []);
    } catch (error) {
      console.error('Error fetching product types:', error);
      setProductTypes([]); // Set empty array on error
    }
  };

  const fetchSKUs = async () => {
    try {
      const response = await fetch('/api/skus');
      if (!response.ok) {
        throw new Error('Failed to fetch SKUs');
      }
      const data = await response.json();
      // Ensure we're getting an array from the API response
      setSkus(Array.isArray(data) ? data : data.skus || []);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setSkus([]); // Set empty array on error
    }
  };

  const onSubmitProductType = async (data: ProductTypeFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/product-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product type');
      }
      
      // Reset form and show success message
      productTypeForm.reset();
      setSuccess('Product type created successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refetch product types
      fetchProductTypes();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSKU = async (data: SKUFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/skus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create SKU');
      }
      
      // Reset form and show success message
      skuForm.reset();
      setSuccess('SKU created successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refetch SKUs
      fetchSKUs();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Handle modal events
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from reaching the backdrop
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose} // Close when clicking backdrop
    >
      {/* Modal content container */}
      <div 
        className="bg-white rounded-lg w-full max-w-3xl mx-auto shadow-xl"
        onClick={handleModalContentClick} // Prevent clicks from closing modal
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Manage Product Types & SKUs
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('types')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'types'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Product Types
              </button>
              <button
                onClick={() => setActiveTab('skus')}
                className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'skus'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                SKUs
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="py-4">
            {/* Success and error messages */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Product Types Tab */}
            {activeTab === 'types' && (
              <div>
                <form onSubmit={productTypeForm.handleSubmit(onSubmitProductType)}>
                  <div className="mb-4">
                    <label htmlFor="productTypeName" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      id="productTypeName"
                      type="text"
                      {...productTypeForm.register('name')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                    {productTypeForm.formState.errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {productTypeForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="productTypeDescription" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="productTypeDescription"
                      rows={3}
                      {...productTypeForm.register('description')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        loading
                          ? 'bg-pink-300'
                          : 'bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Add Product Type'
                      )}
                    </button>
                  </div>
                </form>
                
                <div className="mt-6">
                  <h4 className="text-base font-medium text-gray-900">Existing Product Types</h4>
                  {productTypes.length === 0 ? (
                    <p className="text-gray-500 mt-2">No product types found</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {productTypes.map((type) => (
                            <tr key={type.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {type.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {type.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SKUs Tab */}
            {activeTab === 'skus' && (
              <div>
                <form onSubmit={skuForm.handleSubmit(onSubmitSKU)}>
                  <div className="mb-4">
                    <label htmlFor="skuCode" className="block text-sm font-medium text-gray-700">
                      Code
                    </label>
                    <input
                      id="skuCode"
                      type="text"
                      {...skuForm.register('code')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                    {skuForm.formState.errors.code && (
                      <p className="mt-1 text-sm text-red-600">
                        {skuForm.formState.errors.code.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="skuDescription" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="skuDescription"
                      rows={3}
                      {...skuForm.register('description')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        loading
                          ? 'bg-pink-300'
                          : 'bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Add SKU'
                      )}
                    </button>
                  </div>
                </form>
                
                <div className="mt-6">
                  <h4 className="text-base font-medium text-gray-900">Existing SKUs</h4>
                  {skus.length === 0 ? (
                    <p className="text-gray-500 mt-2">No SKUs found</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Code
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {skus.map((sku) => (
                            <tr key={sku.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {sku.code}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {sku.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
