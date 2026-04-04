'use client';

import { useAuthStore } from '@/store/useAuthStore';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-md">
        <div className="flex items-center justify-between border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Task Management Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
        <div className="mt-8">
          <h2 className="text-xl text-gray-700">
            Welcome back, <span className="font-semibold">{user?.name || user?.email || 'User'}</span>!
          </h2>
          <p className="mt-2 text-gray-500">
            Your tasks will appear here. The UI to manage tasks is coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}
