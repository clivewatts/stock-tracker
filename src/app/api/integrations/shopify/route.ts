import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@/types';
import {
  getShopifySettings,
  saveShopifySettings,
  testShopifyConnection,
  syncAllProductsToShopify,
  importProductsFromShopify
} from '@/services/shopifyIntegration';

// GET integration settings or import products based on action parameter
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = session.user as User;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // Check if this is an import request
    const action = req.nextUrl.searchParams.get('action');
    
    if (action === 'import') {
      // Import products from Shopify
      const result = await importProductsFromShopify();
      
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? `Successfully imported ${result.imported} new products and updated ${result.updated} existing products from Shopify` 
          : 'Failed to import products from Shopify',
        total: result.total,
        imported: result.imported,
        updated: result.updated,
        failed: result.failed
      });
    }
    
    // Default: get settings
    const settings = await getShopifySettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching Shopify settings:', error);
    return NextResponse.json({ error: 'Failed to fetch Shopify settings' }, { status: 500 });
  }
}

// POST update integration settings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = session.user as User;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const data = await req.json();
    const { isEnabled, shopName, apiKey, apiSecret, apiVersion, accessToken } = data;

    // Prepare settings object
    const shopifySettings = {
      shopName,
      apiKey,
      apiSecret,
      apiVersion: apiVersion || '2023-10',
      accessToken
    };

    // Save settings
    const savedSettings = await saveShopifySettings(shopifySettings, isEnabled);

    return NextResponse.json({ 
      success: true, 
      settings: savedSettings 
    });
  } catch (error) {
    console.error('Error updating Shopify settings:', error);
    return NextResponse.json({ error: 'Failed to update Shopify settings' }, { status: 500 });
  }
}

// Test connection to Shopify
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = session.user as User;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const data = await req.json();
    const { shopName, apiKey, apiSecret, apiVersion, accessToken } = data;

    // Prepare settings object for testing
    const shopifySettings = {
      shopName,
      apiKey,
      apiSecret,
      apiVersion: apiVersion || '2023-10',
      accessToken
    };

    // Test connection
    const connected = await testShopifyConnection(shopifySettings);

    return NextResponse.json({ 
      success: connected, 
      message: connected 
        ? 'Successfully connected to Shopify' 
        : 'Failed to connect to Shopify. Please check your credentials.' 
    });
  } catch (error) {
    console.error('Error testing Shopify connection:', error);
    return NextResponse.json({ error: 'Failed to test Shopify connection' }, { status: 500 });
  }
}

// PATCH sync all products from local to Shopify
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = session.user as User;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Sync all products to Shopify
    const result = await syncAllProductsToShopify();

    return NextResponse.json({
      success: result.success,
      message: result.success ? `Successfully synced ${result.synced} products to Shopify` : 'Failed to sync products to Shopify',
      total: result.total,
      synced: result.synced,
      failed: result.failed
    });
  } catch (error) {
    console.error('Error syncing products to Shopify:', error);
    return NextResponse.json({ error: 'Failed to sync products to Shopify' }, { status: 500 });
  }
}
