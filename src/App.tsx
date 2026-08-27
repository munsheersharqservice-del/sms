import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Layout/Header';
import { Navigation } from './components/Layout/Navigation';
import { MobileNavBar } from './components/Layout/MobileNavBar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { NewCaseView } from './components/Cases/NewCaseView';
import { MyDeskView } from './components/Desk/MyDeskView';
import { AssetsView } from './components/Assets/AssetsView';
import { DoneWorkView } from './components/Work/DoneWorkView';
import { RequestsView } from './components/Requests/RequestsView';
import { ProjectsView } from './components/Projects/ProjectsView';
import { CustomersView } from './components/Customers/CustomersView';
import { PpmDueView } from './components/Ppm/PpmDueView';
import { LoginPage } from './components/Auth/LoginPage';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-2.5 sm:pt-3.5 pb-20 md:pb-6">
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'new_case' && <NewCaseView />}
      {activeTab === 'my_desk' && <MyDeskView />}
      {activeTab === 'add_asset' && <AssetsView />}
      {activeTab === 'ppm' && <PpmDueView />}
      {activeTab === 'customers' && <CustomersView />}
      {activeTab === 'done_work' && <DoneWorkView />}
      {activeTab === 'requests' && <RequestsView />}
      {activeTab === 'projects' && <ProjectsView />}
    </main>
  );
};

const AppShell: React.FC = () => {
  const { currentUser, isDarkMode } = useApp();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div
      className={`min-h-screen font-sans antialiased selection:bg-[#1D3557] selection:text-white transition-colors duration-200 ${
        isDarkMode
          ? 'bg-slate-950 text-slate-100 dark'
          : 'bg-[#F8F9FA] text-[#212529]'
      }`}
    >
      <Header />
      <Navigation />
      <MainContent />
      <MobileNavBar />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

