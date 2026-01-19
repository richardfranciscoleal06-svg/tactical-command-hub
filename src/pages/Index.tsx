import { useState } from 'react';
import { TabType } from '@/types/police';
import { Header } from '@/components/police/Header';
import { Navigation } from '@/components/police/Navigation';
import { PatrolReport } from '@/components/police/PatrolReport';
import { SeizureReport } from '@/components/police/SeizureReport';
import { PoliceRegistration } from '@/components/police/PoliceRegistration';
import { AdminDashboard } from '@/components/police/AdminDashboard';
import { AdminSector } from '@/components/police/AdminSector';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('patrulhamento');

  const renderContent = () => {
    switch (activeTab) {
      case 'patrulhamento':
        return <PatrolReport />;
      case 'apreensao':
        return <SeizureReport />;
      case 'cadastro':
        return <PoliceRegistration />;
      case 'administrativo':
        return <AdminDashboard />;
      case 'setor':
        return <AdminSector />;
      default:
        return <PatrolReport />;
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
            SISTEMA POLICIAL • 19º BATALHÃO • v1.0.0
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
