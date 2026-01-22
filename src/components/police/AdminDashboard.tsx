import { useState, useEffect } from 'react';
import { Police } from '@/types/police';
import { 
  getApprovedPolice, 
  getWeeklyHours, 
  getWeeklySeizureTotals,
} from '@/lib/storage';
import { 
  LayoutDashboard, 
  Clock, 
  TrendingUp, 
  Users, 
  Package, 
} from 'lucide-react';

const META_HORAS = 8;

const ITEM_LABELS: Record<string, string> = {
  sementeCannabis: 'Semente de Cannabis',
  cannabisNatura: 'Cannabis in natura',
  fenilacetona: 'Fenilacetona',
  acidoCloridrico: 'Ácido Clorídrico',
  metilamina: 'Metilamina',
  maconha: 'Maconha',
  metanfetamina: 'Metanfetamina',
  pecasArmas: 'Peças de Armas',
  fuzil: 'Fuzil',
  submetralhadora: 'Submetralhadora',
  pistola: 'Pistola',
  municoes762: 'Munições 7.62mm',
  municoes556: 'Munições 5.56mm',
  municoes9mm: 'Munições 9mm',
  dinheiroSujo: 'Dinheiro Sujo',
  coleteBalístico: 'Colete Balístico',
  lockpick: 'Lockpick',
  flipperZero: 'Flipper Zero',
  kevlar: 'Kevlar',
};

export const AdminDashboard = () => {
  const [policiais, setPoliciais] = useState<Police[]>([]);
  const [horasData, setHorasData] = useState<Record<string, number>>({});
  const [seizureData, setSeizureData] = useState<{ totals: Record<string, number>; count: number }>({ totals: {}, count: 0 });

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
    
    const seizures = getWeeklySeizureTotals();
    setSeizureData(seizures);
  };

  const totalHoras = Object.values(horasData).reduce((a, b) => a + b, 0);
  const policiaisAtivos = policiais.filter(p => horasData[p.id] > 0).length;
  const mediaHoras = policiais.length > 0 
    ? totalHoras / policiais.length 
    : 0;

  const totalItensApreendidos = Object.values(seizureData.totals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Controle Administrativo</h2>
            <p className="text-sm text-muted-foreground">Monitoramento de carga horária e apreensões semanais</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
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

        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-destructive/20">
              <Package className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Itens Apreendidos</p>
              <p className="text-2xl font-bold font-mono">{totalItensApreendidos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hours Table */}
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

      {/* Seizures Table */}
      <div className="tactical-card overflow-hidden">
        <div className="p-4 border-b border-tactical-border">
          <h3 className="font-semibold">Apreensões da Semana</h3>
          <p className="text-sm text-muted-foreground">Total de {seizureData.count} apreensões aprovadas</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tactical-border bg-muted/30">
                <th className="text-left p-4 font-medium text-muted-foreground">Item</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(seizureData.totals).filter(([_, value]) => value > 0).length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-muted-foreground">
                    Nenhuma apreensão registrada esta semana
                  </td>
                </tr>
              ) : (
                <>
                  {/* Drugs section */}
                  {['sementeCannabis', 'cannabisNatura', 'fenilacetona', 'acidoCloridrico', 'metilamina', 'maconha', 'metanfetamina']
                    .filter(key => seizureData.totals[key] > 0)
                    .map(key => (
                      <tr key={key} className="border-b border-tactical-border tactical-row transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            {ITEM_LABELS[key]}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{seizureData.totals[key]}</td>
                      </tr>
                    ))}
                  
                  {/* Weapons section */}
                  {['pecasArmas', 'fuzil', 'submetralhadora', 'pistola']
                    .filter(key => seizureData.totals[key] > 0)
                    .map(key => (
                      <tr key={key} className="border-b border-tactical-border tactical-row transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            {ITEM_LABELS[key]}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{seizureData.totals[key]}</td>
                      </tr>
                    ))}
                  
                  {/* Ammo section */}
                  {['municoes762', 'municoes556', 'municoes9mm']
                    .filter(key => seizureData.totals[key] > 0)
                    .map(key => (
                      <tr key={key} className="border-b border-tactical-border tactical-row transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {ITEM_LABELS[key]}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{seizureData.totals[key]}</td>
                      </tr>
                    ))}
                  
                  {/* Others section */}
                  {['dinheiroSujo', 'coleteBalístico', 'lockpick', 'flipperZero', 'kevlar']
                    .filter(key => seizureData.totals[key] > 0)
                    .map(key => (
                      <tr key={key} className="border-b border-tactical-border tactical-row transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {ITEM_LABELS[key]}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{seizureData.totals[key]}</td>
                      </tr>
                    ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
