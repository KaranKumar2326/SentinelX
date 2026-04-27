import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiClient } from './client';

export const ClerkAuthSync = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    const syncToken = async () => {
      if (isLoaded && isSignedIn) {
        const token = await getToken();
        if (token) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } else {
        delete apiClient.defaults.headers.common['Authorization'];
      }
    };

    syncToken();
    
    // Refresh token every 30 seconds
    const interval = setInterval(syncToken, 30000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, getToken]);

  return null;
};
