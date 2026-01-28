import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Package,
  FileText,
  DollarSign,
} from 'lucide-react';

interface APF {
  id: string;
  policial_nome: string;
  itens: Record<string, number>;
  status: string;
  created_at: string;
}

interface PoliceOfficer {
  id: string;
  nome_completo: string;
  cargo: string;
  rg: string;
}

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
  const { user } = useAuth();
  const [policiais, setPoliciais] = useState<PoliceOfficer[]>([]);
  const [apfs, setApfs] = useState<APF[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time APF changes
    const apfChannel = supabase
      .channel('apfs-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apfs' },
        () => {
          loadApfs();
        }
      )
      .subscribe();

    const policeChannel = supabase
      .channel('police-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'police_officers' },
        () => {
          loadPolice();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(apfChannel);
      supabase.removeChannel(policeChannel);
    };
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPolice(), loadApfs()]);
    setLoading(false);
  };

  const loadPolice = async () => {
    const { data, error } = await supabase
      .from('police_officers')
      .select('*')
      .eq('status', 'approved');
    
    if (!error && data) {
      setPoliciais(data);
    }
  };

  const loadApfs = async () => {
    const { data, error } = await supabase
      .from('apfs')
      .select('*')
      .eq('status', 'approved');
    
    if (!error && data) {
      setApfs(data.map(apf => ({
        ...apf,
        itens: apf.itens as Record<string, number>
      })));
    }
  };

  // Calculate APFs per police officer
  const apfsByPolicial = apfs.reduce((acc, apf) => {
    acc[apf.policial_nome] = (acc[apf.policial_nome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate total illegal items (all except dinheiroSujo)
  const totalItensIlegais = apfs.reduce((total, apf) => {
    return total + Object.entries(apf.itens)
      .filter(([key]) => key !== 'dinheiroSujo')
      .reduce((sum, [, value]) => sum + (value || 0), 0);
  }, 0);

  // Calculate total dirty money
  const totalDinheiroSujo = apfs.reduce((total, apf) => {
    return total + (apf.itens.dinheiroSujo || 0);
  }, 0);

  // Calculate seizure totals by category
  const seizureTotals = apfs.reduce((acc, apf) => {
    Object.entries(apf.itens).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + (value || 0);
    });
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Controle Administrativo</h2>
            <p className="text-sm text-muted-foreground">Monitoramento de APFs e apreensões</p>
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
              <p className="text-2xl font-bold font-mono">{policiais.length}</p>
            </div>
          </div>
        </div>

        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-success/20">
              <FileText className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de APFs</p>
              <p className="text-2xl font-bold font-mono">{apfs.length}</p>
            </div>
          </div>
        </div>

        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-destructive/20">
              <Package className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Itens Ilegais</p>
              <p className="text-2xl font-bold font-mono">{totalItensIlegais}</p>
            </div>
          </div>
        </div>

        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-warning/20">
              <DollarSign className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dinheiro Sujo</p>
              <p className="text-2xl font-bold font-mono">${totalDinheiroSujo.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* APFs per Police Officer */}
      <div className="tactical-card overflow-hidden">
        <div className="p-4 border-b border-tactical-border">
          <h3 className="font-semibold">APFs por Policial</h3>
          <p className="text-sm text-muted-foreground">Quantidade de APFs registrados por cada policial</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tactical-border bg-muted/30">
                <th className="text-left p-4 font-medium text-muted-foreground">Policial</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Cargo</th>
                <th className="text-left p-4 font-medium text-muted-foreground">RG</th>
                <th className="text-center p-4 font-medium text-muted-foreground">APFs</th>
              </tr>
            </thead>
            <tbody>
              {policiais.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Nenhum policial cadastrado
                  </td>
                </tr>
              ) : (
                policiais.map(p => {
                  const apfCount = apfsByPolicial[p.nome_completo] || 0;
                  
                  return (
                    <tr key={p.id} className="border-b border-tactical-border tactical-row transition-colors">
                      <td className="p-4 font-medium">{p.nome_completo}</td>
                      <td className="p-4 text-muted-foreground">{p.cargo}</td>
                      <td className="p-4 font-mono text-muted-foreground">{p.rg}</td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold ${
                          apfCount > 0 ? 'text-success' : 'text-muted-foreground'
                        }`}>
                          {apfCount}
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
          <h3 className="font-semibold">Apreensões Totais</h3>
          <p className="text-sm text-muted-foreground">Total de {apfs.length} APFs aprovados</p>
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
              {Object.entries(seizureTotals).filter(([_, value]) => value > 0).length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-muted-foreground">
                    Nenhuma apreensão registrada
                  </td>
                </tr>
              ) : (
                <>
                  {/* Drugs section */}
                  {['sementeCannabis', 'cannabisNatura', 'fenilacetona', 'acidoCloridrico', 'metilamina', 'maconha', 'metanfetamina']
                    .filter(key => seizureTotals[key] > 0)
                    .map(key => (
                      <tr key={key} className="border-b border-tactical-border tactical-row transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            {ITEM_LABELS[key]}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{seizureTotals[key]}</td>
                      </tr>
                    ))}
                  
                  {/* Weapons section */}
                  {['pecasArmas', 'fuzil', 'submetralhadora', 'pistola']
                    .filter(key => seizureTotals[key] > 0)
                    .map(key => (
                      <tr key={key} className="border-b border-tactical-border tactical-row transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            {ITEM_LABELS[key]}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{seizureTotals[key]}</td>
                      </tr>
                    ))}
                  
                  {/* Ammo section */}
                  {['municoes762', 'municoes556', 'municoes9mm']
                    .filter(key => seizureTotals[key] > 0)
                    .map(key => (
                      <tr key={key} className="border-b border-tactical-border tactical-row transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {ITEM_LABELS[key]}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{seizureTotals[key]}</td>
                      </tr>
                    ))}
                  
                  {/* Others section */}
                  {['dinheiroSujo', 'coleteBalístico', 'lockpick', 'flipperZero', 'kevlar']
                    .filter(key => seizureTotals[key] > 0)
                    .map(key => (
                      <tr key={key} className="border-b border-tactical-border tactical-row transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {ITEM_LABELS[key]}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{seizureTotals[key]}</td>
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
