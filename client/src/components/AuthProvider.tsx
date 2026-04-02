'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import apiClient from '../lib/axios';

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrateAuth = async () => {
      // If Zustand already knows we are authenticated, we don't need to re-fetch
      if (isAuthenticated) {
        setLoading(false);
        return;
      }

      // Optimization: we can check document.cookie (if not HttpOnly, but refreshToken IS HttpOnly)
      // Since it's HttpOnly, we must attempt the request. But wait, if we are on the /login page,
      // and we don't have a cookie, the request will fail and we'll just log an error.
      // This is fine.

      try {
        // Let's trigger a refresh directly
        const refreshRes = await apiClient.post('/auth/refresh');
        const token = refreshRes.data.accessToken;

        // Now fetch the user's profile using the fresh token
        const meRes = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setAuth(meRes.data, token);
      } catch (error) {
        // If the refresh fails (e.g. no cookie), it's completely fine, they are just unauthenticated.
        // We do NOT need to spam errors if they are just on the login page.
      } finally {
        setLoading(false);
      }
    };

    hydrateAuth();
  }, [isAuthenticated, setAuth]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading application...</p>
      </div>
    );
  }

  return <>{children}</>;
}