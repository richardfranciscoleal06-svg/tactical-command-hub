import { useState } from 'react';
import { TabType } from '@/types/police';
import { Header } from '@/components/police/Header';
import { Navigation } from '@/components/police/Navigation';
import { APFReport } from '@/components/police/APFReport';
import { PoliceRegistration } from '@/components/police/PoliceRegistration';
import { AdminDashboard } from '@/components/police/AdminDashboard';
import { AdminSector } from '@/components/police/AdminSector';
import { ChefiaDAP } from '@/components/police/ChefiaDEC';
import UserApproval from '@/pages/UserApproval';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('apf');

  const renderContent = () => {
    switch (activeTab) {
      case 'apf':
        return <APFReport />;
      case 'cadastro':
        return <PoliceRegistration />;
      case 'administrativo':
        return <AdminDashboard />;
      case 'setor':
        return <AdminSector />;
      case 'chefia':
        return <ChefiaDAP />;
      case 'usuarios':
        return <UserApproval />;
      default:
        return <APFReport />;
    }
  };

  return (
    <div className="min-h-screen bg-background tactical-bg">
      {/* Scanner animation */}
      <div className="scanner-line" />
      
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="container mx-auto px-4 py-6">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="border-t border-tactical-border mt-8 py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            SISTEMA POLICIAL • DEC PCESP • v1.0.0
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
