import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { sectorLabel } from '@/types/police';

export const Header = () => {
  const { user, signOut, currentSector, isAdmin, adminSector } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
    navigate('/auth');
  };

  return (
    <header className="border-b border-tactical-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Shield className="w-12 h-12 text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-glow">
              POLÍCIA MILITAR - SP
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Sistema de Gestão Operacional
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {user && (currentSector || adminSector || isAdmin) && (
              <Badge variant="outline" className="hidden md:inline-flex border-primary/40 text-primary font-mono">
                {isAdmin ? 'TODOS OS SETORES' : sectorLabel(adminSector ?? currentSector)}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-mono text-muted-foreground">
                SISTEMA ATIVO
              </span>
            </div>
            {user && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};