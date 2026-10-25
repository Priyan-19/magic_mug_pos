import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CatalogPage } from './pages/CatalogPage';
import { ExpensesPage } from './pages/ExpensesPage';
import magicMugLogo from './assets/logo.png';

const MainLayout: React.FC = () => {
  const { user, isInitializing } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // If checking existing session on boot, show subtle splash
  if (isInitializing) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-[#F4F5F7] select-none">
        <div className="w-20 h-20 rounded-full bg-white p-2 shadow-lg border-2 border-maroon-700/20 mb-4 animate-pulse">
          <img
            src={magicMugLogo}
            alt="Magic Mug"
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <div className="w-8 h-8 border-3 border-maroon-700/20 border-t-maroon-700 rounded-full animate-spin" />
      </div>
    );
  }

  // If no user is authenticated, render the interactive LoginPage
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] h-screen h-[100dvh] bg-[#F4F5F7] flex overflow-hidden font-sans">
      {/* Left Minimalist Vertical Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <TopHeader
          activeTab={activeTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchPlaceholder={
            activeTab === 'pos'
              ? 'Search menu (e.g. Latte, Croissant)...'
              : 'Search Magic Mug...'
          }
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <main className="flex-1 min-h-0 pb-16 md:pb-0 relative overflow-hidden">
          <div className={`h-full w-full overflow-hidden ${activeTab === 'pos' ? 'block' : 'hidden'}`}>
            <PosPage searchTerm={searchTerm} />
          </div>
          <div className={`h-full w-full overflow-y-auto ${activeTab === 'history' ? 'block' : 'hidden'}`}>
            <HistoryPage />
          </div>
          <div className={`h-full w-full overflow-y-auto ${activeTab === 'analytics' ? 'block' : 'hidden'}`}>
            <AnalyticsPage />
          </div>
          <div className={`h-full w-full overflow-y-auto ${activeTab === 'catalog' ? 'block' : 'hidden'}`}>
            <CatalogPage />
          </div>
          <div className={`h-full w-full overflow-y-auto ${activeTab === 'expenses' ? 'block' : 'hidden'}`}>
            <ExpensesPage />
          </div>
        </main>
      </div>

      {/* User Profile & Security Settings Modal */}
      <AccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MainLayout />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
