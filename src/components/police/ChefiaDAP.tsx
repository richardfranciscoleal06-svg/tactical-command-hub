import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Police, Patrol, Seizure } from '@/types/police';
import { 
  getApprovedPolice, 
  getWeeklyHours, 
  getWeeklySeizureTotals,
  wasPdfGenerated,
  setPdfGenerated,
  resetDashboards,
  getPolice,
  savePolice,
  getPatrols,
  savePatrols,
  getSeizures,
  saveSeizures,
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Crown, 
  Lock, 
  FileDown, 
  RotateCcw,
  AlertTriangle,
  Check,
  Database,
  Trash2,
  Users,
  Car,
  FileText,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const ChefiaDAP = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [canReset, setCanReset] = useState(false);
  
  // Data
  const [policiais, setPoliciais] = useState<Police[]>([]);
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [seizures, setSeizures] = useState<Seizure[]>([]);
  const [horasData, setHorasData] = useState<Record<string, number>>({});
  const [seizureData, setSeizureData] = useState<{ totals: Record<string, number>; count: number }>({ totals: {}, count: 0 });
  
  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'police' | 'patrol' | 'seizure'; id: string; name: string } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = () => {
    const approved = getApprovedPolice();
    setPoliciais(approved);
    
    const allPolice = getPolice();
    const allPatrols = getPatrols();
    const allSeizures = getSeizures();
    
    setPatrols(allPatrols);
    setSeizures(allSeizures);
    
    const horas: Record<string, number> = {};
    approved.forEach(p => {
      horas[p.id] = getWeeklyHours(p.id);
    });
    setHorasData(horas);
    
    const seizuresData = getWeeklySeizureTotals();
    setSeizureData(seizuresData);
    
    setCanReset(wasPdfGenerated());
  };

  const totalHoras = Object.values(horasData).reduce((a, b) => a + b, 0);
  const policiaisAtivos = policiais.filter(p => horasData[p.id] > 0).length;
  const mediaHoras = policiais.length > 0 ? totalHoras / policiais.length : 0;
  const totalItensApreendidos = Object.values(seizureData.totals).reduce((a, b) => a + b, 0);

  const generatePDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentTime = new Date().toLocaleTimeString('pt-BR');

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Departamento de Administração e Planejamento - PCESP', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório Semanal - ${currentDate} às ${currentTime}`, 105, 28, { align: 'center' });

    // Summary stats
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 14, 42);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Policiais Ativos: ${policiaisAtivos}`, 14, 52);
    doc.text(`Total de Horas: ${totalHoras.toFixed(1)}h`, 14, 58);
    doc.text(`Média por Policial: ${mediaHoras.toFixed(1)}h`, 14, 64);
    doc.text(`Total de APFs: ${seizureData.count}`, 14, 70);
    doc.text(`Total de Itens Apreendidos: ${totalItensApreendidos}`, 14, 76);

    // Hours table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Carga Horária Semanal', 14, 90);

    const horasTableData = policiais.map(p => {
      const horas = horasData[p.id] || 0;
      const status = horas >= 8 ? 'Meta atingida' : 'Abaixo da meta';
      return [p.nomeCompleto, p.cargo, p.rg, `${horas.toFixed(1)}h`, status];
    });

    autoTable(doc, {
      startY: 95,
      head: [['Policial', 'Cargo', 'RG', 'Horas', 'Status']],
      body: horasTableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 9 },
    });

    // Seizure table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Itens Apreendidos na Semana', 14, finalY);

    const seizureTableData = Object.entries(seizureData.totals)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => [ITEM_LABELS[key] || key, value.toString()]);

    if (seizureTableData.length > 0) {
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Item', 'Quantidade']],
        body: seizureTableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 },
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhum item apreendido esta semana.', 14, finalY + 10);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount} - Gerado automaticamente pelo Sistema DAP PCESP`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(`relatorio-semanal-dap-${currentDate.replace(/\//g, '-')}.pdf`);
    
    // Mark PDF as generated
    setPdfGenerated(true);
    setCanReset(true);
    
    toast.success('PDF gerado com sucesso!');
  };

  const handleReset = () => {
    if (!canReset) {
      toast.error('Você precisa gerar o PDF antes de resetar os dashboards.');
      return;
    }
    
    if (confirm('Tem certeza que deseja resetar todos os dados dos dashboards? Esta ação não pode ser desfeita.')) {
      resetDashboards();
      loadData();
      toast.success('Dashboards resetados com sucesso!');
    }
  };

  const openDeleteModal = (type: 'police' | 'patrol' | 'seizure', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    const { type, id } = deleteTarget;

    if (type === 'police') {
      const updated = getPolice().filter(p => p.id !== id);
      savePolice(updated);
    } else if (type === 'patrol') {
      const updated = getPatrols().filter(p => p.id !== id);
      savePatrols(updated);
    } else if (type === 'seizure') {
      const updated = getSeizures().filter(s => s.id !== id);
      saveSeizures(updated);
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
    loadData();
    toast.success('Registro excluído com sucesso!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

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
              Você não tem permissão para acessar a Chefia DAP.
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
          <div className="p-2 rounded-lg bg-warning/10 border border-warning/30">
            <Crown className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Chefia DAP</h2>
            <p className="text-sm text-muted-foreground">Gestão administrativa e controle de dados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDF} className="gap-2">
            <FileDown className="w-4 h-4" />
            Gerar PDF
          </Button>
          <Button 
            onClick={handleReset} 
            variant={canReset ? "destructive" : "outline"}
            className="gap-2"
            disabled={!canReset}
          >
            <RotateCcw className="w-4 h-4" />
            Resetar
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/30">
            <Lock className="w-4 h-4 text-success" />
            <span className="text-sm text-success font-medium">Admin</span>
          </div>
        </div>
      </div>

      {!canReset && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Gere o PDF da semana antes de resetar os dashboards.</span>
        </div>
      )}

      {canReset && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm">
          <Check className="w-4 h-4" />
          <span>PDF gerado! Você pode resetar os dashboards quando desejar.</span>
        </div>
      )}

      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="bg-muted/50 border border-tactical-border">
          <TabsTrigger value="database" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Database className="w-4 h-4" />
            Base de Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-6">
          {/* Policiais */}
          <div className="tactical-card overflow-hidden">
            <div className="p-4 border-b border-tactical-border flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Policiais Cadastrados</h3>
              <span className="ml-auto text-sm text-muted-foreground">
                {getPolice().length} registros
              </span>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-tactical-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Cargo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">RG</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getPolice().map(p => (
                    <tr key={p.id} className="border-b border-tactical-border tactical-row">
                      <td className="p-3 font-medium">{p.nomeCompleto}</td>
                      <td className="p-3 text-muted-foreground">{p.cargo}</td>
                      <td className="p-3 font-mono text-muted-foreground">{p.rg}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.status === 'approved' ? 'bg-success/20 text-success' :
                          p.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {p.status === 'approved' ? 'Aprovado' : p.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteModal('police', p.id, p.nomeCompleto)}
                          className="gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Patrulhamentos */}
          <div className="tactical-card overflow-hidden">
            <div className="p-4 border-b border-tactical-border flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Patrulhamentos</h3>
              <span className="ml-auto text-sm text-muted-foreground">
                {getPatrols().length} registros
              </span>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-tactical-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Unidade</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Assinatura</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Horas</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getPatrols().map(p => (
                    <tr key={p.id} className="border-b border-tactical-border tactical-row">
                      <td className="p-3 font-medium">Unidade {p.unidade}</td>
                      <td className="p-3 text-muted-foreground">{p.assinatura}</td>
                      <td className="p-3 font-mono">{p.horasTrabalhadas?.toFixed(2) || '-'}h</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.status === 'approved' ? 'bg-success/20 text-success' :
                          p.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                          p.status === 'active' ? 'bg-primary/20 text-primary' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {p.status === 'approved' ? 'Aprovado' : 
                           p.status === 'rejected' ? 'Rejeitado' : 
                           p.status === 'active' ? 'Em andamento' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{formatDate(p.inicioTimestamp)}</td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteModal('patrol', p.id, `Unidade ${p.unidade}`)}
                          className="gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* APFs */}
          <div className="tactical-card overflow-hidden">
            <div className="p-4 border-b border-tactical-border flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">APFs (Apreensões)</h3>
              <span className="ml-auto text-sm text-muted-foreground">
                {getSeizures().length} registros
              </span>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-tactical-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Policial</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Itens</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getSeizures().map(s => {
                    const totalItens = Object.values(s.itens).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={s.id} className="border-b border-tactical-border tactical-row">
                        <td className="p-3 font-medium">{s.policialNome}</td>
                        <td className="p-3 font-mono">{totalItens}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            s.status === 'approved' ? 'bg-success/20 text-success' :
                            s.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                            'bg-warning/20 text-warning'
                          }`}>
                            {s.status === 'approved' ? 'Aprovado' : s.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDate(s.createdAt)}</td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDeleteModal('seizure', s.id, `APF de ${s.policialNome}`)}
                            className="gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-card border-tactical-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>?
            </p>
            <p className="text-sm text-destructive mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
