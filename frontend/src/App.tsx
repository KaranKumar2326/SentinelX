import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import DashboardLayout from './layouts/DashboardLayout';
import IncidentDashboard from './pages/IncidentDashboard';
import IncidentDetail from './pages/IncidentDetail';
import AlertsPage from './pages/AlertsPage';
import MetricsPage from './pages/MetricsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import { Toaster } from 'react-hot-toast';
import { ClerkAuthSync } from './api/ClerkAuthSync';

const queryClient = new QueryClient();
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ClerkAuthSync />
      <QueryClientProvider client={queryClient}>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <>
                  <SignedIn>
                    <DashboardLayout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/incidents" replace />} />
                        <Route path="/incidents" element={<IncidentDashboard />} />
                        <Route path="/incidents/:id" element={<IncidentDetail />} />
                        <Route path="/alerts" element={<AlertsPage />} />
                        <Route path="/metrics" element={<MetricsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                      </Routes>
                    </DashboardLayout>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
