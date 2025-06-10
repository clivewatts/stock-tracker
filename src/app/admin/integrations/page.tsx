'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { IntegrationSettings, ShopifySettings } from '@/types';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Form schema for Shopify settings
const shopifySettingsSchema = z.object({
  isEnabled: z.boolean(),
  shopName: z.string().min(1, 'Shop name is required'),
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().min(1, 'API secret is required'),
  apiVersion: z.string().min(1, 'API version is required'),
  accessToken: z.string().min(1, 'Access token is required'),
});

type ShopifyFormValues = z.infer<typeof shopifySettingsSchema>;

export default function IntegrationsPage() {
  const { /* data: session, status */ } = useSession(); // Not using these directly; relying on useAuth instead
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [shopifySettings, setShopifySettings] = useState<IntegrationSettings | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({
    status: 'idle',
    message: '',
  });
  const [syncStatus, setSyncStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    details?: { total: number; synced: number; failed: number };
  }>({
    status: 'idle',
    message: '',
  });
  const [importStatus, setImportStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    details?: { total: number; imported: number; updated: number; failed: number };
  }>({
    status: 'idle',
    message: '',
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ShopifyFormValues>({
    resolver: zodResolver(shopifySettingsSchema),
    defaultValues: {
      isEnabled: false,
      shopName: '',
      apiKey: '',
      apiSecret: '',
      apiVersion: '2023-10',
      accessToken: '',
    },
  });

  // Check auth and redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/integrations/shopify');
        
        if (!response.ok) {
          throw new Error('Failed to fetch Shopify settings');
        }
        
        const data = await response.json();
        
        if (data.settings) {
          setShopifySettings(data.settings);
          
          // Populate form with existing settings
          const settings = data.settings.settings as ShopifySettings;
          setValue('isEnabled', data.settings.isEnabled);
          setValue('shopName', settings.shopName || '');
          setValue('apiKey', settings.apiKey || '');
          setValue('apiSecret', settings.apiSecret || '');
          setValue('apiVersion', settings.apiVersion || '2023-10');
          setValue('accessToken', settings.accessToken || '');
        }
      } catch (error) {
        console.error('Error fetching Shopify settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && !authLoading) {
      fetchSettings();
    }
  }, [isAdmin, authLoading, setValue]);

  // Save settings
  const onSubmit: SubmitHandler<ShopifyFormValues> = async (data) => {
    setSaving(true);
    try {
      const response = await fetch('/api/integrations/shopify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save Shopify settings');
      }
      
      const result = await response.json();
      setShopifySettings(result.settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving Shopify settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const testConnection = async (data: ShopifyFormValues) => {
    setTesting(true);
    setConnectionStatus({ status: 'idle', message: '' });
    
    try {
      const response = await fetch('/api/integrations/shopify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      setConnectionStatus({
        status: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error) {
      console.error('Error testing Shopify connection:', error);
      setConnectionStatus({
        status: 'error',
        message: 'Failed to test connection. Please try again.',
      });
    } finally {
      setTesting(false);
    }
  };

  // Sync all products
  const syncAllProducts = async () => {
    setSyncing(true);
    setSyncStatus({ status: 'idle', message: '' });
    
    try {
      const response = await fetch('/api/integrations/shopify', {
        method: 'PATCH',
      });
      
      const result = await response.json();
      
      setSyncStatus({
        status: result.success ? 'success' : 'error',
        message: result.message,
        details: {
          total: result.total,
          synced: result.synced,
          failed: result.failed,
        },
      });
    } catch (error) {
      console.error('Error syncing products to Shopify:', error);
      setSyncStatus({
        status: 'error',
        message: 'Failed to sync products. Please try again.',
      });
    } finally {
      setSyncing(false);
    }
  };
  
  // Import products from Shopify
  const importProducts = async () => {
    setImporting(true);
    setImportStatus({ status: 'idle', message: '' });
    
    try {
      const response = await fetch('/api/integrations/shopify?action=import', {
        method: 'GET',
      });
      
      const result = await response.json();
      
      setImportStatus({
        status: result.success ? 'success' : 'error',
        message: result.message,
        details: {
          total: result.total,
          imported: result.imported,
          updated: result.updated,
          failed: result.failed,
        },
      });
    } catch (error) {
      console.error('Error importing products from Shopify:', error);
      setImportStatus({
        status: 'error',
        message: 'Failed to import products. Please try again.',
      });
    } finally {
      setImporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Redirecting in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600 mb-6">Configure external integrations for your inventory system.</p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Shopify Integration</h2>
          <p className="text-gray-600 mb-6">
            Connect your inventory system with Shopify to automatically sync products and inventory levels.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center">
              <input 
                type="checkbox"
                id="isEnabled"
                className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                {...register('isEnabled')} 
              />
              <label htmlFor="isEnabled" className="ml-2 block text-sm font-medium text-gray-700">
                Enable Shopify Integration
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name (your-store.myshopify.com)
                </label>
                <input
                  type="text"
                  id="shopName"
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="your-store.myshopify.com"
                  {...register('shopName')}
                />
                {errors.shopName && (
                  <p className="mt-1 text-sm text-red-600">{errors.shopName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  id="apiKey"
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="API Key"
                  {...register('apiKey')}
                />
                {errors.apiKey && (
                  <p className="mt-1 text-sm text-red-600">{errors.apiKey.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700 mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  id="apiSecret"
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="API Secret"
                  {...register('apiSecret')}
                />
                {errors.apiSecret && (
                  <p className="mt-1 text-sm text-red-600">{errors.apiSecret.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="apiVersion" className="block text-sm font-medium text-gray-700 mb-1">
                  API Version
                </label>
                <input
                  type="text"
                  id="apiVersion"
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="2023-10"
                  {...register('apiVersion')}
                />
                {errors.apiVersion && (
                  <p className="mt-1 text-sm text-red-600">{errors.apiVersion.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token
                </label>
                <input
                  type="password"
                  id="accessToken"
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Access Token"
                  {...register('accessToken')}
                />
                {errors.accessToken && (
                  <p className="mt-1 text-sm text-red-600">{errors.accessToken.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              
              <button
                type="button"
                onClick={() => handleSubmit(testConnection)()}
                disabled={testing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {connectionStatus.status !== 'idle' && (
              <div className={`mt-4 p-4 rounded-md ${
                connectionStatus.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {connectionStatus.message}
              </div>
            )}
          </form>
        </div>

        {shopifySettings?.isEnabled && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Synchronization</h2>
            <p className="text-gray-600 mb-4">
              Manually sync all products to Shopify. This will create new products in Shopify or update existing ones.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4">
              <button
                type="button"
                onClick={testConnection}
                disabled={testing || saving || !shopifySettings?.isEnabled}
                className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${(testing || !shopifySettings?.isEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              
              <button
                type="button"
                onClick={importProducts}
                disabled={importing || !shopifySettings?.isEnabled}
                className={`px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${(importing || !shopifySettings?.isEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {importing ? 'Importing...' : 'Import Products from Shopify'}
              </button>
              
              <button
                type="button"
                onClick={syncAllProducts}
                disabled={syncing || !shopifySettings?.isEnabled}
                className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${(syncing || !shopifySettings?.isEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {syncing ? 'Syncing...' : 'Sync Products to Shopify'}
              </button>
            </div>

            {connectionStatus.status !== 'idle' && (
              <div className={`mt-4 p-4 rounded-md ${
                connectionStatus.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {connectionStatus.message}
              </div>
            )}
            
            {importStatus.status !== 'idle' && (
              <div className={`mt-4 p-4 rounded-md ${
                importStatus.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <div>{importStatus.message}</div>
                {importStatus.details && (
                  <div className="mt-2 text-sm">
                    Total: {importStatus.details.total}, 
                    Imported: {importStatus.details.imported}, 
                    Updated: {importStatus.details.updated}, 
                    Failed: {importStatus.details.failed}
                  </div>
                )}
              </div>
            )}
            
            {syncStatus.status !== 'idle' && (
              <div className={`mt-4 p-4 rounded-md ${
                syncStatus.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <div>{syncStatus.message}</div>
                {syncStatus.details && (
                  <div className="mt-2 text-sm">
                    Total: {syncStatus.details.total}, 
                    Synced: {syncStatus.details.synced}, 
                    Failed: {syncStatus.details.failed}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
