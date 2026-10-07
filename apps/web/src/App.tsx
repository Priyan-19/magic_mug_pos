import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CatalogPage } from './pages/CatalogPage';
import { ExpensesPage } from './pages/ExpensesPage';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [isBootAnimationComplete, setIsBootAnimationComplete] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Show the animated 4.5s loading / boot screen
  if (!isBootAnimationComplete || !user) {
    return <LoginPage onComplete={() => setIsBootAnimationComplete(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex overflow-hidden font-sans">
      {/* Left Minimalist Vertical Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader
          activeTab={activeTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchPlaceholder={
            activeTab === 'pos'
              ? 'Search menu (e.g. Latte, Croissant)...'
              : 'Search Magic Mug...'
          }
        />

        <main className={`flex-1 min-h-0 pb-16 md:pb-0 ${activeTab === 'pos' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {activeTab === 'pos' && <PosPage searchTerm={searchTerm} />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'catalog' && <CatalogPage />}
          {activeTab === 'expenses' && <ExpensesPage />}
        </main>
      </div>

      {/* Keyboard Shortcuts Guide */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
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
