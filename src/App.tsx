import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout, NavTab } from './components/layout/AppLayout';
import { backend } from './db/backendService';
import { offlineQueue } from './db/offlineQueue';

// Auth & Public Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { TermsPage } from './pages/legal/TermsPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { SupportPage } from './pages/support/SupportPage';

// Authenticated Application Modules
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { POSPage } from './pages/pos/POSPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { KitchenDisplayPage } from './pages/kitchen/KitchenDisplayPage';
import { TablesPage } from './pages/tables/TablesPage';
import { MenuPage } from './pages/menu/MenuPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { StaffPage } from './pages/staff/StaffPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { SuperAdminPage } from './pages/superadmin/SuperAdminPage';

type UnauthView = 'login' | 'register' | 'terms' | 'privacy';

const MainShell: React.FC = () => {
  const { currentUser, currentRestaurant, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [unauthView, setUnauthView] = useState<UnauthView>('register');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncInfo, setSyncInfo] = useState(() => backend.getSyncStatus(currentRestaurant?.id));

  useEffect(() => {
    const updateSync = () => setSyncInfo(backend.getSyncStatus(currentRestaurant?.id));
    updateSync();
    const unsubBackend = backend.subscribe(updateSync);
    const unsubQueue = offlineQueue.subscribe(updateSync);
    return () => {
      unsubBackend();
      unsubQueue();
    };
  }, [currentRestaurant?.id]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (currentRestaurant?.id) {
        backend.syncOfflineQueue(currentRestaurant.id);
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentRestaurant?.id]);

  // Sync tab according to role when user changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'superadmin') {
        setCurrentTab('superadmin');
      } else if (currentUser.role === 'kitchen') {
        setCurrentTab('kitchen');
      } else if (currentUser.role === 'cashier') {
        setCurrentTab('pos');
      } else if (currentUser.role === 'owner') {
        setCurrentTab('dashboard');
      }
    }
  }, [currentUser?.id, currentUser?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded bg-[#1B4332] text-white flex items-center justify-center font-bold text-sm animate-pulse mb-3">
          DF
        </div>
        <p className="text-xs font-semibold text-[#6C757D]">Initializing DineFlow Engine...</p>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!currentUser) {
    if (unauthView === 'register') {
      return (
        <RegisterPage
          onNavigateLogin={() => setUnauthView('login')}
          onNavigateTerms={() => setUnauthView('terms')}
          onNavigatePrivacy={() => setUnauthView('privacy')}
        />
      );
    }
    if (unauthView === 'terms') {
      return <TermsPage onBack={() => setUnauthView('login')} />;
    }
    if (unauthView === 'privacy') {
      return <PrivacyPolicyPage onBack={() => setUnauthView('login')} />;
    }
    return (
      <LoginPage
        onNavigateRegister={() => setUnauthView('register')}
      />
    );
  }

  // Active page renderer
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;
      case 'pos':
        return <POSPage />;
      case 'orders':
        return <OrdersPage />;
      case 'kitchen':
        return <KitchenDisplayPage />;
      case 'tables':
        return <TablesPage />;
      case 'menu':
        return <MenuPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'staff':
        return <StaffPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'superadmin':
        if (currentUser.role !== 'superadmin') {
          return <DashboardPage onNavigate={setCurrentTab} />;
        }
        return <SuperAdminPage />;
      case 'terms':
        return <TermsPage onBack={() => setCurrentTab('dashboard')} />;
      case 'privacy':
        return <PrivacyPolicyPage onBack={() => setCurrentTab('dashboard')} />;
      case 'support':
        return <SupportPage />;
      default:
        return <DashboardPage onNavigate={setCurrentTab} />;
    }
  };

  return (
    <>
      {(!isOnline || syncInfo.pendingCount > 0 || syncInfo.lastSyncError) && (
        <div
          className={`text-white text-xs py-1.5 px-4 text-center font-medium sticky top-0 z-50 flex items-center justify-center gap-3 ${
            !isOnline ? 'bg-[#A76527]' : syncInfo.lastSyncError ? 'bg-[#D94A43]' : 'bg-[#078F36]'
          }`}
        >
          <span>
            {!isOnline
              ? `Offline Mode: ${syncInfo.pendingCount} pending operation(s) queued safely for sync.`
              : syncInfo.isSyncing
              ? `Synchronizing ${syncInfo.pendingCount} pending operation(s) with Supabase...`
              : syncInfo.lastSyncError
              ? `Sync Notice: ${syncInfo.lastSyncError} (${syncInfo.pendingCount} pending)`
              : `${syncInfo.pendingCount} pending offline operation(s) ready to sync.`}
          </span>
          {isOnline && syncInfo.pendingCount > 0 && !syncInfo.isSyncing && currentRestaurant?.id && (
            <button
              onClick={() => backend.syncOfflineQueue(currentRestaurant.id)}
              className="px-2.5 py-0.5 bg-white/20 hover:bg-white/30 rounded font-bold underline"
            >
              Sync Now
            </button>
          )}
        </div>
      )}
      <AppLayout currentTab={currentTab} onNavigate={setCurrentTab}>
        {renderContent()}
      </AppLayout>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainShell />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
