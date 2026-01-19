import { useState, useEffect } from 'react';
import { Police } from '@/types/police';
import { getApprovedPolice, getWeeklyHours } from '@/lib/storage';
import { LayoutDashboard, Clock, TrendingUp, Users } from 'lucide-react';

const META_HORAS = 8;

export const AdminDashboard = () => {
  const [policiais, setPoliciais] = useState<Police[]>([]);
  const [horasData, setHorasData] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const approved = getApprovedPolice();
    setPoliciais(approved);
    
    const horas: Record<string, number> = {};
    approved.forEach(p => {
      horas[p.id] = getWeeklyHours(p.id);
    });
    setHorasData(horas);
  };

  const totalHoras = Object.values(horasData).reduce((a, b) => a + b, 0);
  const policiaisAtivos = policiais.filter(p => horasData[p.id] > 0).length;
  const mediaHoras = policiais.length > 0 
    ? totalHoras / policiais.length 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <LayoutDashboard className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Controle Administrativo</h2>
          <p className="text-sm text-muted-foreground">Monitoramento de carga horária semanal</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Policiais Ativos</p>
              <p className="text-2xl font-bold font-mono">{policiaisAtivos}</p>
            </div>
          </div>
        </div>

        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-success/20">
              <Clock className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Horas</p>
              <p className="text-2xl font-bold font-mono">{totalHoras.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-warning/20">
              <TrendingUp className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Média por Policial</p>
              <p className="text-2xl font-bold font-mono">{mediaHoras.toFixed(1)}h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="tactical-card overflow-hidden">
        <div className="p-4 border-b border-tactical-border">
          <h3 className="font-semibold">Carga Horária Semanal</h3>
          <p className="text-sm text-muted-foreground">Meta: {META_HORAS}h por semana</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tactical-border bg-muted/30">
                <th className="text-left p-4 font-medium text-muted-foreground">Policial</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Cargo</th>
                <th className="text-left p-4 font-medium text-muted-foreground">RG</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Horas</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {policiais.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum policial cadastrado
                  </td>
                </tr>
              ) : (
                policiais.map(p => {
                  const horas = horasData[p.id] || 0;
                  const atingiuMeta = horas >= META_HORAS;
                  
                  return (
                    <tr key={p.id} className="border-b border-tactical-border tactical-row transition-colors">
                      <td className="p-4 font-medium">{p.nomeCompleto}</td>
                      <td className="p-4 text-muted-foreground">{p.cargo}</td>
                      <td className="p-4 font-mono text-muted-foreground">{p.rg}</td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold ${
                          atingiuMeta ? 'text-success' : 'text-destructive'
                        }`}>
                          {horas.toFixed(1)}h
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          atingiuMeta 
                            ? 'bg-success/20 text-success' 
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {atingiuMeta ? 'Meta atingida' : 'Abaixo da meta'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
