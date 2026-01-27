import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Police, Patrol, Seizure, AuditLog } from '@/types/police';
import { 
  getPolice, updatePolice,
  getPatrols, updatePatrol,
  getSeizures, updateSeizure,
  getLogs, addLog,
} from '@/lib/storage';
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
  Clock, 
  FileText, 
  Package, 
  UserPlus,
  History,
  Filter,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminSector = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  
  // Data
  const [pendingPolice, setPendingPolice] = useState<Police[]>([]);
  const [pendingPatrols, setPendingPatrols] = useState<Patrol[]>([]);
  const [pendingSeizures, setPendingSeizures] = useState<Seizure[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterOficial, setFilterOficial] = useState<string>('all');
  
  // Modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState<{
    type: 'patrol' | 'seizure' | 'registration';
    id: string;
    action: 'approve' | 'reject';
    description: string;
  } | null>(null);
  const [oficialNome, setOficialNome] = useState('');
  const [oficialRg, setOficialRg] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = () => {
    setPendingPolice(getPolice().filter(p => p.status === 'pending'));
    setPendingPatrols(getPatrols().filter(p => p.status === 'pending'));
    setPendingSeizures(getSeizures().filter(s => s.status === 'pending'));
    setLogs(getLogs());
  };

  const openApprovalModal = (
    type: 'patrol' | 'seizure' | 'registration',
    id: string,
    action: 'approve' | 'reject',
    description: string
  ) => {
    setApprovalData({ type, id, action, description });
    setShowApprovalModal(true);
  };

  const confirmAction = () => {
    if (!approvalData) return;
    if (!oficialNome.trim() || !oficialRg.trim()) {
      toast.error('Preencha nome e RG do oficial');
      return;
    }

    const { type, id, action, description } = approvalData;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const actionText = action === 'approve' ? 'Aceitou' : 'Negou';

    // Update record
    if (type === 'patrol') {
      updatePatrol(id, { status });
    } else if (type === 'seizure') {
      updateSeizure(id, { status });
    } else {
      updatePolice(id, { status });
    }

    // Add log
    const log: AuditLog = {
      id: crypto.randomUUID(),
      oficialResponsavel: oficialNome,
      oficialRg,
      acao: `${actionText} ${description}`,
      tipo: type,
      dataHora: new Date().toISOString(),
    };
    addLog(log);

    // Reset and reload
    setShowApprovalModal(false);
    setApprovalData(null);
    setOficialNome('');
    setOficialRg('');
    loadData();
    toast.success(`${actionText} com sucesso!`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getUniqueOfficials = () => {
    const officials = logs.map(l => l.oficialResponsavel);
    return [...new Set(officials)];
  };

  const filteredLogs = filterOficial === 'all' 
    ? logs 
    : logs.filter(l => l.oficialResponsavel === filterOficial);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] animate-fade-in">
        <div className="tactical-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Verificando permissões...</p>
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

      <Tabs defaultValue="patrols" className="space-y-4">
        <TabsList className="bg-muted/50 border border-tactical-border">
          <TabsTrigger value="patrols" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="w-4 h-4" />
            Patrulhamentos
            {pendingPatrols.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-warning text-warning-foreground">
                {pendingPatrols.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="seizures" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="w-4 h-4" />
            APFs
            {pendingSeizures.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-warning text-warning-foreground">
                {pendingSeizures.length}
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

        <TabsContent value="patrols" className="space-y-4">
          {pendingPatrols.length === 0 ? (
            <div className="tactical-card p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Nenhum patrulhamento pendente
            </div>
          ) : (
            pendingPatrols.map(patrol => (
              <div key={patrol.id} className="tactical-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">Unidade {patrol.unidade}</p>
                    <p className="text-sm text-muted-foreground">
                      Assinatura: {patrol.assinatura}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      Duração: {patrol.horasTrabalhadas?.toFixed(2)}h
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(patrol.inicioTimestamp)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openApprovalModal('patrol', patrol.id, 'approve', `Patrulhamento da Unidade ${patrol.unidade}`)}
                      className="gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openApprovalModal('patrol', patrol.id, 'reject', `Patrulhamento da Unidade ${patrol.unidade}`)}
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

        <TabsContent value="seizures" className="space-y-4">
          {pendingSeizures.length === 0 ? (
            <div className="tactical-card p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Nenhum APF pendente
            </div>
          ) : (
            pendingSeizures.map(seizure => {
              const totalItens = Object.values(seizure.itens).reduce((a, b) => a + b, 0);
              return (
                <div key={seizure.id} className="tactical-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold">{seizure.policialNome}</p>
                      
                      {/* Informações do Indivíduo */}
                      {seizure.nomeIndividuo && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/30">
                          <p className="text-sm font-medium text-destructive">Indivíduo Apreendido:</p>
                          <p className="text-sm">{seizure.nomeIndividuo} - RG: {seizure.rgIndividuo}</p>
                        </div>
                      )}
                      
                      {/* Policiais da QRU */}
                      {seizure.policiaisQru && (
                        <div className="mt-2 p-2 bg-muted/30 rounded border border-tactical-border">
                          <p className="text-sm font-medium text-primary">Policiais da QRU:</p>
                          <p className="text-sm text-muted-foreground">{seizure.policiaisQru}</p>
                        </div>
                      )}
                      
                      {/* Informações da QRU - Descrição para análise */}
                      {seizure.informacoesQru && (
                        <div className="mt-2 p-3 bg-primary/5 rounded border border-primary/30">
                          <p className="text-sm font-medium text-primary">Informações da Ocorrência (QRU):</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{seizure.informacoesQru}</p>
                        </div>
                      )}
                      
                      {/* Artigos */}
                      {seizure.artigos && seizure.artigos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Artigos: <span className="text-primary">{seizure.artigos.join(', ')}</span></p>
                          <p className="text-sm text-warning">Tempo de prisão: {seizure.tempoPrisao} minutos</p>
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground mt-2">
                        {totalItens} itens apreendidos
                      </p>
                      {seizure.urlComprovacao && (
                        <a 
                          href={seizure.urlComprovacao} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Ver comprovação
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(seizure.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openApprovalModal('seizure', seizure.id, 'approve', `APF de ${seizure.policialNome}`)}
                        className="gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openApprovalModal('seizure', seizure.id, 'reject', `APF de ${seizure.policialNome}`)}
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
                    <p className="font-semibold">{police.nomeCompleto}</p>
                    <p className="text-sm text-muted-foreground">
                      {police.cargo} • RG: {police.rg}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cursos: {police.cursos.join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(police.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openApprovalModal('registration', police.id, 'approve', `Cadastro de ${police.nomeCompleto}`)}
                      className="gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openApprovalModal('registration', police.id, 'reject', `Cadastro de ${police.nomeCompleto}`)}
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
                  <th className="text-left p-3 font-medium text-muted-foreground">Data/Hora</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Oficial</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">RG</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="border-b border-tactical-border tactical-row">
                      <td className="p-3 text-sm">{formatDate(log.dataHora)}</td>
                      <td className="p-3 font-medium">{log.oficialResponsavel}</td>
                      <td className="p-3 font-mono text-muted-foreground">{log.oficialRg}</td>
                      <td className="p-3 text-sm">{log.acao}</td>
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
              {approvalData?.action === 'approve' ? 'Aceitar' : 'Negar'} {approvalData?.description}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Preencha os dados do oficial responsável pela {approvalData?.action === 'approve' ? 'aprovação' : 'reprovação'}:
            </p>
            
            <div>
              <Label>Nome do Oficial</Label>
              <Input
                value={oficialNome}
                onChange={(e) => setOficialNome(e.target.value)}
                placeholder="Nome completo"
                className="mt-1.5 bg-input border-tactical-border"
              />
            </div>
            
            <div>
              <Label>RG do Oficial</Label>
              <Input
                value={oficialRg}
                onChange={(e) => setOficialRg(e.target.value)}
                placeholder="RG"
                className="mt-1.5 bg-input border-tactical-border"
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
