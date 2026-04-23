import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeUrl, isValidUrl } from '@/lib/urlValidator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lock, 
  Unlock, 
  Check, 
  X, 
  Package, 
  UserPlus,
  History,
  Filter,
  ShieldAlert,
  Loader2,
  Car,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface PoliceOfficer {
  id: string;
  nome_completo: string;
  rg: string;
  cargo: string;
  status: string;
  created_at: string;
}

interface APF {
  id: string;
  policial_nome: string;
  policiais_qru: string | null;
  nome_individuo: string;
  rg_individuo: string;
  informacoes_qru: string;
  artigos: string[];
  tempo_prisao: number;
  itens: Record<string, number>;
  url_comprovacao: string;
  status: string;
  created_at: string;
}

interface PatrolPending {
  id: string;
  user_id: string;
  policiais: string[];
  unidade: string;
  inicio_timestamp: string;
  fim_timestamp: string | null;
  horas_trabalhadas: number | null;
  relatorio: string | null;
  itens: Record<string, number> | null;
  imagens_ilicitos: string[] | null;
  status: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  oficial_responsavel: string;
  oficial_rg: string;
  acao: string;
  tipo: string;
  data_hora: string;
}

export const AdminSector = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data
  const [pendingPolice, setPendingPolice] = useState<PoliceOfficer[]>([]);
  const [pendingApfs, setPendingApfs] = useState<APF[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterOficial, setFilterOficial] = useState<string>('all');
  
  // Modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState<{
    type: 'apf' | 'registration';
    id: string;
    action: 'approve' | 'reject';
    description: string;
  } | null>(null);
  const [oficialNome, setOficialNome] = useState('');
  const [oficialRg, setOficialRg] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadData();

      // Subscribe to real-time changes
      const apfChannel = supabase
        .channel('apfs-admin')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'apfs' },
          () => loadApfs()
        )
        .subscribe();

      const policeChannel = supabase
        .channel('police-admin')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'police_officers' },
          () => loadPolice()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(apfChannel);
        supabase.removeChannel(policeChannel);
      };
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPolice(), loadApfs()]);
    // Load logs from localStorage for now (could be migrated to Supabase later)
    const storedLogs = localStorage.getItem('pm19_logs');
    if (storedLogs) {
      try {
        const parsedLogs = JSON.parse(storedLogs);
        // Convert old format to new format
        setLogs(parsedLogs.map((log: any) => ({
          id: log.id,
          oficial_responsavel: log.oficialResponsavel || log.oficial_responsavel,
          oficial_rg: log.oficialRg || log.oficial_rg,
          acao: log.acao,
          tipo: log.tipo,
          data_hora: log.dataHora || log.data_hora,
        })));
      } catch {
        setLogs([]);
      }
    }
    setLoading(false);
  };

  const loadPolice = async () => {
    const { data, error } = await supabase
      .from('police_officers')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPendingPolice(data);
    }
  };

  const loadApfs = async () => {
    const { data, error } = await supabase
      .from('apfs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPendingApfs(data.map(apf => ({
        ...apf,
        itens: apf.itens as Record<string, number>
      })));
    }
  };

  const openApprovalModal = (
    type: 'apf' | 'registration',
    id: string,
    action: 'approve' | 'reject',
    description: string
  ) => {
    setApprovalData({ type, id, action, description });
    setShowApprovalModal(true);
  };

  const confirmAction = async () => {
    if (!approvalData) return;
    if (!oficialNome.trim() || !oficialRg.trim()) {
      toast.error('Preencha nome e RG do oficial');
      return;
    }

    const { type, id, action, description } = approvalData;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const actionText = action === 'approve' ? 'Aceitou' : 'Negou';

    // Update record in Supabase
    if (type === 'apf') {
      const { error } = await supabase
        .from('apfs')
        .update({ status })
        .eq('id', id);

      if (error) {
        toast.error('Erro ao atualizar APF');
        return;
      }
    } else {
      const { error } = await supabase
        .from('police_officers')
        .update({ status })
        .eq('id', id);

      if (error) {
        toast.error('Erro ao atualizar policial');
        return;
      }
    }

    // Add log to localStorage
    const log: AuditLog = {
      id: crypto.randomUUID(),
      oficial_responsavel: oficialNome,
      oficial_rg: oficialRg,
      acao: `${actionText} ${description}`,
      tipo: type,
      data_hora: new Date().toISOString(),
    };

    const currentLogs = [...logs, log];
    setLogs(currentLogs);
    localStorage.setItem('pm19_logs', JSON.stringify(currentLogs));

    // Reset and reload
    setShowApprovalModal(false);
    setApprovalData(null);
    setOficialNome('');
    setOficialRg('');
    toast.success(`${actionText} com sucesso!`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getUniqueOfficials = () => {
    const officials = logs.map(l => l.oficial_responsavel);
    return [...new Set(officials)];
  };

  const filteredLogs = filterOficial === 'all' 
    ? logs 
    : logs.filter(l => l.oficial_responsavel === filterOficial);

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] animate-fade-in">
        <div className="tactical-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px] animate-fade-in">
        <div className="tactical-card p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="p-4 rounded-full bg-destructive/10 inline-block mb-4">
              <ShieldAlert className="w-12 h-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Acesso Negado</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Você não tem permissão para acessar o Setor Administrativo.
              Apenas administradores podem acessar esta área.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <Unlock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Setor Administrativo</h2>
            <p className="text-sm text-muted-foreground">Gestão de aprovações e logs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/30">
          <Lock className="w-4 h-4 text-success" />
          <span className="text-sm text-success font-medium">Admin</span>
        </div>
      </div>

      <Tabs defaultValue="seizures" className="space-y-4">
        <TabsList className="bg-muted/50 border border-tactical-border">
          <TabsTrigger value="seizures" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="w-4 h-4" />
            APFs
            {pendingApfs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-warning text-warning-foreground">
                {pendingApfs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="registrations" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserPlus className="w-4 h-4" />
            Cadastros
            {pendingPolice.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-warning text-warning-foreground">
                {pendingPolice.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-4 h-4" />
            Histórico de Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seizures" className="space-y-4">
          {pendingApfs.length === 0 ? (
            <div className="tactical-card p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Nenhum APF pendente
            </div>
          ) : (
            pendingApfs.map(apf => {
              const totalItens = Object.entries(apf.itens)
                .filter(([key]) => key !== 'dinheiroSujo')
                .reduce((sum, [, value]) => sum + (value || 0), 0);
              return (
                <div key={apf.id} className="tactical-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold">{apf.policial_nome}</p>
                      
                      {/* Informações do Indivíduo */}
                      <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/30">
                        <p className="text-sm font-medium text-destructive">Indivíduo Apreendido:</p>
                        <p className="text-sm">{apf.nome_individuo} - RG: {apf.rg_individuo}</p>
                      </div>
                      
                      {/* Policiais da QRU */}
                      {apf.policiais_qru && (
                        <div className="mt-2 p-2 bg-muted/30 rounded border border-tactical-border">
                          <p className="text-sm font-medium text-primary">Policiais da QRU:</p>
                          <p className="text-sm text-muted-foreground">{apf.policiais_qru}</p>
                        </div>
                      )}
                      
                      {/* Informações da QRU */}
                      <div className="mt-2 p-3 bg-primary/5 rounded border border-primary/30">
                        <p className="text-sm font-medium text-primary">Informações da Ocorrência (QRU):</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{apf.informacoes_qru}</p>
                      </div>
                      
                      {/* Artigos */}
                      {apf.artigos && apf.artigos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Artigos: <span className="text-primary">{apf.artigos.join(', ')}</span></p>
                          <p className="text-sm text-warning">Tempo de prisão: {apf.tempo_prisao} minutos</p>
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground mt-2">
                        {totalItens} itens ilegais • ${apf.itens.dinheiroSujo || 0} dinheiro sujo
                      </p>
                      {apf.url_comprovacao && isValidUrl(apf.url_comprovacao) && (
                        <a 
                          href={sanitizeUrl(apf.url_comprovacao)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Ver comprovação
                        </a>
                      )}
                      {apf.url_comprovacao && !isValidUrl(apf.url_comprovacao) && (
                        <span className="text-sm text-destructive">
                          URL de comprovação inválida
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(apf.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openApprovalModal('apf', apf.id, 'approve', `APF de ${apf.policial_nome}`)}
                        className="gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openApprovalModal('apf', apf.id, 'reject', `APF de ${apf.policial_nome}`)}
                        className="gap-1"
                      >
                        <X className="w-4 h-4" />
                        Negar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="registrations" className="space-y-4">
          {pendingPolice.length === 0 ? (
            <div className="tactical-card p-8 text-center text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Nenhum cadastro pendente
            </div>
          ) : (
            pendingPolice.map(police => (
              <div key={police.id} className="tactical-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{police.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">
                      {police.cargo} • RG: {police.rg}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(police.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openApprovalModal('registration', police.id, 'approve', `Cadastro de ${police.nome_completo}`)}
                      className="gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openApprovalModal('registration', police.id, 'reject', `Cadastro de ${police.nome_completo}`)}
                      className="gap-1"
                    >
                      <X className="w-4 h-4" />
                      Negar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="tactical-card p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Label>Filtrar por Oficial:</Label>
              </div>
              <Select value={filterOficial} onValueChange={setFilterOficial}>
                <SelectTrigger className="w-[200px] bg-input border-tactical-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ver Todos</SelectItem>
                  {getUniqueOfficials().map(oficial => (
                    <SelectItem key={oficial} value={oficial}>
                      {oficial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="tactical-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-tactical-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Oficial</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">RG</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Ação</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  filteredLogs.slice().reverse().map(log => (
                    <tr key={log.id} className="border-b border-tactical-border tactical-row">
                      <td className="p-4 font-medium">{log.oficial_responsavel}</td>
                      <td className="p-4 font-mono text-muted-foreground">{log.oficial_rg}</td>
                      <td className="p-4">{log.acao}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.tipo === 'apf' ? 'bg-primary/20 text-primary' :
                          log.tipo === 'registration' ? 'bg-success/20 text-success' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {log.tipo === 'apf' ? 'APF' : 
                           log.tipo === 'registration' ? 'Cadastro' : 
                           log.tipo}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(log.data_hora)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="bg-card border-tactical-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalData?.action === 'approve' ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <X className="w-5 h-5 text-destructive" />
              )}
              {approvalData?.action === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-muted-foreground">
              {approvalData?.description}
            </p>
            
            <div>
              <Label className="mb-2 block">Nome do Oficial Responsável</Label>
              <Input
                value={oficialNome}
                onChange={(e) => setOficialNome(e.target.value)}
                placeholder="Nome completo"
                className="bg-input border-tactical-border"
              />
            </div>
            
            <div>
              <Label className="mb-2 block">RG do Oficial</Label>
              <Input
                value={oficialRg}
                onChange={(e) => setOficialRg(e.target.value.replace(/\D/g, ''))}
                placeholder="Somente números"
                className="bg-input border-tactical-border font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmAction}
              variant={approvalData?.action === 'approve' ? 'default' : 'destructive'}
              className="gap-2"
            >
              {approvalData?.action === 'approve' ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};