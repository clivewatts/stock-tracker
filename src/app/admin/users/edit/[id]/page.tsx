'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { User } from '@/types';

// Define form schema using zod
const userSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }).optional().or(z.literal('')),
  role: z.enum(['user', 'admin'])
});

// Define form data type from schema
type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { status } = useSession();
  const { isAdmin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      password: '',
    }
  });
  
  // Check authentication and admin role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard');
    }
  }, [status, router, isAdmin]);
  
  // Fetch user data
  useEffect(() => {
    if (status === 'authenticated' && isAdmin && userId) {
      const fetchUser = async () => {
        try {
          setLoading(true);
          
          const response = await fetch(`/api/users/${userId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch user');
          }
          
          const data = await response.json();
          setUser(data.user);
          
          // Set form values from user
          if (data.user) {
            setValue('name', data.user.name);
            setValue('email', data.user.email);
            setValue('role', data.user.role);
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          setError(error instanceof Error ? error.message : 'An error occurred while fetching user data');
        } finally {
          setLoading(false);
        }
      };
      
      fetchUser();
    }
  }, [status, isAdmin, userId, setValue]);
  
  const onSubmit = async (data: UserFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Only include password if it's not empty
      const payload = {
        name: data.name,
        email: data.email,
        role: data.role,
        ...(data.password ? { password: data.password } : {})
      };
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
      
      setSuccess(true);
      
      // Redirect to users list after a delay
      setTimeout(() => {
        router.push('/admin/users');
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error('User update error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while updating the user');
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
  
  if (!user) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-red-500">User not found</p>
        <Link href="/admin/users" className="mt-4 text-blue-500 hover:underline">
          Back to Users
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Edit User</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Update user information
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
                <h3 className="text-sm font-medium text-green-800">User updated successfully</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Redirecting to users list...</p>
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
              <div className="sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="name"
                    {...register('name')}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <div className="mt-1">
                  <select
                    id="role"
                    {...register('role')}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="email"
                    {...register('email')}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password (leave blank to keep current password)
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    id="password"
                    {...register('password')}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link
              href="/admin/users"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
