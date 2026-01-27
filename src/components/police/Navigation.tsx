import { TabType } from '@/types/police';
import { 
  FileText, 
  UserPlus, 
  LayoutDashboard, 
  Lock,
  Crown,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'apf', label: 'APF', icon: <FileText className="w-5 h-5" /> },
  { id: 'cadastro', label: 'Cadastro', icon: <UserPlus className="w-5 h-5" /> },
  { id: 'administrativo', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'setor', label: 'Setor Admin', icon: <Lock className="w-5 h-5" /> },
  { id: 'usuarios', label: 'Usuários', icon: <Users className="w-5 h-5" /> },
  { id: 'chefia', label: 'Chefia DAP', icon: <Crown className="w-5 h-5" /> },
];

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  return (
    <nav className="border-b border-tactical-border bg-card/50">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                "hover:text-primary hover:bg-primary/5",
                activeTab === tab.id 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
