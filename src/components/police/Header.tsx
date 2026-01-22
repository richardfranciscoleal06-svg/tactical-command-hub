import { Shield } from 'lucide-react';

export const Header = () => {
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
              SISTEMA POLICIAL
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              DEPARTAMENTO DE ADMINISTRAÇÃO E PLANEJAMENTO DA PCESP
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">
              SISTEMA ATIVO
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
