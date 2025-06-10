'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/context/AuthContext';
import { Product, ProductType, SKU } from '@/types';
import { formatCurrency } from '@/utils/currency';
import Image from 'next/image';
import Link from 'next/link';

interface ProductPageClientProps {
  productId: string;
}

export default function ProductPageClient({ productId }: ProductPageClientProps) {
  const router = useRouter();
  const { status } = useSession();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [sku, setSku] = useState<SKU | null>(null);
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch product data
  useEffect(() => {
    if (status === 'authenticated' && productId) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          
          // Fetch product details
          const response = await fetch(`/api/products/${productId}`);
          
          if (!response.ok) {
            router.push('/products');
            return;
          }
          
          const responseData = await response.json();
          // Access the product data from the nested structure
          const productData = responseData.product;
          if (!productData) {
            console.error('Product data not found in API response:', responseData);
            router.push('/products');
            return;
          }
          setProduct(productData);
          
          // If product has a product type, fetch it
          if (productData.productTypeId) {
            try {
              const typeResponse = await fetch(`/api/product-types`);
              if (typeResponse.ok) {
                const typesData = await typeResponse.json();
                // Handle both array and object response formats
                const types = Array.isArray(typesData) ? typesData : typesData.productTypes || [];
                const foundType = types.find(
                  (type: ProductType) => type.id === productData.productTypeId
                );
                setProductType(foundType || null);
              }
            } catch (error) {
              console.error('Error fetching product type:', error);
            }
          }
          
          // If product has a SKU, fetch it
          if (productData.skuId) {
            try {
              const skuResponse = await fetch(`/api/skus`);
              if (skuResponse.ok) {
                const skusData = await skuResponse.json();
                // Handle both array and object response formats
                const skus = Array.isArray(skusData) ? skusData : skusData.skus || [];
                const foundSku = skus.find(
                  (sku: SKU) => sku.id === productData.skuId
                );
                setSku(foundSku || null);
              }
            } catch (error) {
              console.error('Error fetching SKU:', error);
            }
          }
          
        } catch (error) {
          console.error('Error fetching product:', error);
          router.push('/products');
        } finally {
          setLoading(false);
        }
      };
      
      fetchProduct();
    }
  }, [productId, router, status]);
  
  const deleteProduct = async () => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      
      router.push('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-gray-500">Product not found</p>
        <Link href="/products" className="mt-4 text-pink-500 hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg leading-6 font-medium text-gray-900">Product Details</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Product information and specifications</p>
        </div>
        <div className="flex space-x-2">
          <Link
            href={`/sales/create?productId=${product.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            Sell Item
          </Link>
          {isAdmin && (
            <>
              <Link
                href={`/admin/products/edit/${product.id}`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-500 hover:bg-pink-600"
              >
                Edit
              </Link>
              <button
                onClick={deleteProduct}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="border-t border-gray-200">
        <div className="flex flex-col md:flex-row">
          {/* Product Image */}
          <div className="w-full md:w-1/3 p-4 flex items-center justify-center">
            <div className="relative h-72 w-72">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={300}
                  height={300}
                  className="object-contain rounded-md"
                />
              ) : (
                <div className="h-72 w-72 bg-gray-200 rounded-md flex items-center justify-center">
                  <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Product Info */}
          <div className="w-full md:w-2/3 p-4">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
              <div className="mt-2 text-gray-600 product-description" dangerouslySetInnerHTML={{ __html: product.description || '' }} />
            </div>
            
            <dl className="py-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Price</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrency(product.price)}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Current Stock</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  <span className={product.stockCount <= 5 ? 'text-red-600' : ''}>
                    {product.stockCount}
                  </span>
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Barcode</dt>
                <dd className="mt-1 text-sm text-gray-900">{product.barcode || 'N/A'}</dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Product Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{productType?.name || 'N/A'}</dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">SKU</dt>
                <dd className="mt-1 text-sm text-gray-900">{sku?.code || 'N/A'}</dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : 'N/A'}
                </dd>
              </div>
            </dl>
            
            {/* Barcode Display */}
            {product.barcode && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500">Barcode</h4>
                <div className="mt-2 flex justify-center bg-white p-2 rounded-md">
                  <div id="barcodeContainer" className="h-16"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Actions Footer */}
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <div className="flex justify-between">
          <Link
            href="/products"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Products
          </Link>
          
          {isAdmin && (
            <div className="flex space-x-2">
              <Link
                href={`/admin/products/stock/${product.id}`}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-pink-500 hover:bg-pink-600"
              >
                Update Stock
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Barcode rendering could be implemented here if needed
// For example:
// useEffect(() => {
//   if (typeof window === 'undefined' || !product?.barcode) return;
//   
//   const renderBarcode = async () => {
//     try {
//       const JsBarcode = (await import('jsbarcode')).default;
//       const container = document.getElementById('barcodeContainer');
//       if (container) {
//         container.innerHTML = '';
//         const canvas = document.createElement('canvas');
//         container.appendChild(canvas);
//         JsBarcode(canvas, product.barcode, {
//           format: 'CODE128',
//           displayValue: true,
//           fontSize: 14,
//           margin: 10
//         });
//       }
//     } catch (error) {
//       console.error('Error rendering barcode:', error);
//     }
//   };
//   
//   renderBarcode();
// }, [product?.barcode]);
