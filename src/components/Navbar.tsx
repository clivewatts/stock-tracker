'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types';

const Navbar = () => {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Fix hydration mismatch - only render auth-dependent content after mounting on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    return pathname === path ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white';
  };

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-white text-xl font-bold">
                Stock Tracker
              </Link>
            </div>
            {user && (
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link 
                    href="/dashboard" 
                    className={`${isActive('/dashboard')} rounded-md px-3 py-2 text-sm font-medium`}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/products" 
                    className={`${isActive('/products')} rounded-md px-3 py-2 text-sm font-medium`}
                  >
                    Products
                  </Link>
                  <Link 
                    href="/sales" 
                    className={`${isActive('/sales')} rounded-md px-3 py-2 text-sm font-medium`}
                  >
                    Sales
                  </Link>
                  {mounted && isAdmin && (
                    <>
                      <Link 
                        href="/admin/products" 
                        className={`${isActive('/admin/products')} rounded-md px-3 py-2 text-sm font-medium`}
                      >
                        Manage Products
                      </Link>
                      <Link 
                        href="/admin/users" 
                        className={`${isActive('/admin/users')} rounded-md px-3 py-2 text-sm font-medium`}
                      >
                        Manage Users
                      </Link>
                      <Link 
                        href="/admin/integrations" 
                        className={`${isActive('/admin/integrations')} rounded-md px-3 py-2 text-sm font-medium`}
                      >
                        Integrations
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {mounted && user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300 text-sm">
                    {(user as User).name} ({isAdmin ? 'Admin' : 'User'})
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden" id="mobile-menu">
        {mounted && user && (
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            <Link
              href="/dashboard"
              className={`${isActive('/dashboard')} block rounded-md px-3 py-2 text-base font-medium`}
            >
              Dashboard
            </Link>
            <Link
              href="/products"
              className={`${isActive('/products')} block rounded-md px-3 py-2 text-base font-medium`}
            >
              Products
            </Link>
            <Link
              href="/sales"
              className={`${isActive('/sales')} block rounded-md px-3 py-2 text-base font-medium`}
            >
              Sales
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin/products"
                  className={`${isActive('/admin/products')} block rounded-md px-3 py-2 text-base font-medium`}
                >
                  Manage Products
                </Link>
                <Link
                  href="/admin/users"
                  className={`${isActive('/admin/users')} block rounded-md px-3 py-2 text-base font-medium`}
                >
                  Manage Users
                </Link>
                <Link
                  href="/admin/integrations"
                  className={`${isActive('/admin/integrations')} block rounded-md px-3 py-2 text-base font-medium`}
                >
                  Integrations
                </Link>
              </>
            )}
          </div>
        )}
        <div className="border-t border-gray-700 pb-3 pt-4">
          {mounted && user ? (
            <div className="flex items-center px-5">
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">
                  {(user as User).name}
                </div>
                <div className="text-sm font-medium leading-none text-gray-400">
                  {(user as User).email}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="ml-auto flex-shrink-0 rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="px-5">
              <Link
                href="/login"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
