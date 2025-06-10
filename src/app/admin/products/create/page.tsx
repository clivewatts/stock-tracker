'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { ProductType, SKU } from '@/types';

// Define form schema using zod
const productSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  description: z.string().optional(),
  barcode: z.string().optional(),
  productTypeId: z.string().optional(),
  skuId: z.string().optional(),
  price: z.number().min(0.01, { message: 'Price must be greater than 0' }),
  stockCount: z.number().min(0, { message: 'Stock count cannot be negative' }),
  image: z.instanceof(FileList).optional().refine(
    (files) => !files || files.length === 0 || Array.from(files).every(file => 
      ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)
    ),
    { message: "Only .jpg, .jpeg, and .png files are accepted." }
  )
});

// Define form data type from schema
type ProductFormData = z.infer<typeof productSchema>;

export default function CreateProductPage() {
  const router = useRouter();
  const { status } = useSession();
  const { isAdmin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      price: 0,
      stockCount: 0,
    }
  });
  
  const imageFile = watch('image');
  
  // Preview image when selected
  useEffect(() => {
    if (imageFile && imageFile.length > 0) {
      const file = imageFile[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);
  
  // Check authentication and admin role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard');
    }
  }, [status, router, isAdmin]);
  
  // Fetch product types and SKUs
  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      const fetchProductData = async () => {
        try {
          // Fetch product types
          const typesResponse = await fetch('/api/product-types');
          const typesData = await typesResponse.json();
          setProductTypes(typesData.productTypes || []);
          
          // Fetch SKUs
          const skusResponse = await fetch('/api/skus');
          const skusData = await skusResponse.json();
          setSkus(skusData.skus || []);
        } catch (error) {
          console.error('Failed to fetch product data:', error);
        }
      };
      
      fetchProductData();
    }
  }, [status, isAdmin]);
  
  const onSubmit = async (data: ProductFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('name', data.name);
      
      if (data.description) formData.append('description', data.description);
      if (data.barcode) formData.append('barcode', data.barcode);
      if (data.productTypeId) formData.append('productTypeId', data.productTypeId);
      if (data.skuId) formData.append('skuId', data.skuId);
      
      formData.append('price', data.price.toString());
      formData.append('stockCount', data.stockCount.toString());
      
      // Append image if exists
      if (data.image && data.image.length > 0) {
        formData.append('image', data.image[0]);
      }
      
      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, fetch will automatically set it with the boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }
      
      setSuccess(true);
      
      // Redirect to products list after a delay
      setTimeout(() => {
        router.push('/products');
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error('Product creation error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while creating the product');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (status === 'loading' || (status === 'authenticated' && isAdmin === null)) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }
  
  if (status === 'authenticated' && !isAdmin) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-red-500">You do not have permission to access this page.</p>
        <Link href="/dashboard" className="mt-4 text-pink-500 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Create New Product</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Add a new product to the inventory
        </p>
      </div>
      
      {success ? (
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="rounded-md bg-pink-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-pink-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-pink-800">Product created successfully</h3>
                <div className="mt-2 text-sm text-pink-700">
                  <p>Redirecting to products list...</p>
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
              <div className="sm:col-span-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Product Name *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="name"
                    {...register('name')}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    rows={3}
                    {...register('description')}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
                  Barcode
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="barcode"
                    {...register('barcode')}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="productTypeId" className="block text-sm font-medium text-gray-700">
                  Product Type
                </label>
                <div className="mt-1">
                  <select
                    id="productTypeId"
                    {...register('productTypeId')}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">-- Select Type --</option>
                    {productTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="skuId" className="block text-sm font-medium text-gray-700">
                  SKU (Optional)
                </label>
                <div className="mt-1">
                  <select
                    id="skuId"
                    {...register('skuId')}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">-- Select SKU --</option>
                    {skus.map((sku) => (
                      <option key={sku.id} value={sku.id}>
                        {sku.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price *
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="price"
                    step="0.01"
                    min="0"
                    {...register('price', { valueAsNumber: true })}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="stockCount" className="block text-sm font-medium text-gray-700">
                  Stock Count *
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="stockCount"
                    min="0"
                    {...register('stockCount', { valueAsNumber: true })}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                {errors.stockCount && (
                  <p className="mt-1 text-sm text-red-600">{errors.stockCount.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                  Product Image
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div>
                        <Image 
                          src={imagePreview} 
                          alt="Image preview" 
                          className="mx-auto h-32 object-cover"
                          width={128}
                          height={128}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Click &quot;Choose File&quot; again to change the image
                        </p>
                      </div>
                    ) : (
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-pink-500">
                        <span>Upload a file</span>
                        <input 
                          id="image-upload" 
                          type="file" 
                          accept=".jpg,.jpeg,.png"
                          className="sr-only" 
                          {...register('image')}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, JPEG up to 2MB
                    </p>
                  </div>
                </div>
                {errors.image && (
                  <p className="mt-1 text-sm text-red-600">{errors.image.message?.toString()}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link
              href="/products"
              className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
