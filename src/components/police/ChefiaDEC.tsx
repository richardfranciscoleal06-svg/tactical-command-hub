import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  FileText,
  ShieldAlert,
  Loader2,
  Pencil,
  DollarSign,
  Package
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

// Hierarquia de cargos do GER (do mais alto ao mais baixo)
const ALL_CARGOS = [
  'Diretor GER',
  'Coordenador GER',
  'Inspetor GER',
  'Chefe de Equipe GER',
  'Operador GER',
  'Estagiário GER',
  'Agente Probatório',
];

interface PoliceOfficer {
  id: string;
  user_id: string;
  nome_completo: string;
  rg: string;
  data_ingresso: string;
  cargo: string;
  status: string;
  created_at: string;
}

interface APF {
  id: string;
  user_id: string;
  policial_id: string;
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

export const ChefiaDEC = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [canReset, setCanReset] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  
  // Data
  const [policiais, setPoliciais] = useState<PoliceOfficer[]>([]);
  const [apfs, setApfs] = useState<APF[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'police' | 'apf'; id: string; name: string } | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<{ type: 'police' | 'apf'; data: PoliceOfficer | APF } | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PoliceOfficer>>({});
  const [editApfFormData, setEditApfFormData] = useState<Partial<APF>>({});

  useEffect(() => {
    if (isAdmin) {
      loadData();

      // Subscribe to real-time changes
      const apfChannel = supabase
        .channel('apfs-chefia')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'apfs' },
          () => loadApfs()
        )
        .subscribe();

      const policeChannel = supabase
        .channel('police-chefia')
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
    setLoading(false);
  };

  const loadPolice = async () => {
    const { data, error } = await supabase
      .from('police_officers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPoliciais(data);
    }
  };

  const loadApfs = async () => {
    const { data, error } = await supabase
      .from('apfs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setApfs(data.map(apf => ({
        ...apf,
        itens: apf.itens as Record<string, number>
      })));
    }
  };

  // Calculate statistics
  const approvedPolice = policiais.filter(p => p.status === 'approved');
  const approvedApfs = apfs.filter(a => a.status === 'approved');

  // Calculate APFs per police officer
  const apfsByPolicial = approvedApfs.reduce((acc, apf) => {
    acc[apf.policial_nome] = (acc[apf.policial_nome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate total illegal items
  const totalItensIlegais = approvedApfs.reduce((total, apf) => {
    return total + Object.entries(apf.itens)
      .filter(([key]) => key !== 'dinheiroSujo')
      .reduce((sum, [, value]) => sum + (value || 0), 0);
  }, 0);

  // Calculate total dirty money
  const totalDinheiroSujo = approvedApfs.reduce((total, apf) => {
    return total + (apf.itens.dinheiroSujo || 0);
  }, 0);

  // Calculate seizure totals
  const seizureTotals = approvedApfs.reduce((acc, apf) => {
    Object.entries(apf.itens).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + (value || 0);
    });
    return acc;
  }, {} as Record<string, number>);

  const generatePDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentTime = new Date().toLocaleTimeString('pt-BR');

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Departamento de Ensino e Carreira - PCESP', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório - ${currentDate} às ${currentTime}`, 105, 28, { align: 'center' });

    // Summary stats
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 14, 42);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Policiais Cadastrados: ${approvedPolice.length}`, 14, 52);
    doc.text(`Total de APFs: ${approvedApfs.length}`, 14, 58);
    doc.text(`Total de Itens Ilegais: ${totalItensIlegais}`, 14, 64);
    doc.text(`Total de Dinheiro Sujo: $${totalDinheiroSujo.toLocaleString()}`, 14, 70);

    // APFs per police officer table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('APFs por Policial', 14, 84);

    const apfTableData = approvedPolice.map(p => {
      return [p.nome_completo, p.cargo, p.rg, (apfsByPolicial[p.nome_completo] || 0).toString()];
    });

    autoTable(doc, {
      startY: 89,
      head: [['Policial', 'Cargo', 'RG', 'APFs']],
      body: apfTableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 9 },
    });

    // Seizure table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Itens Apreendidos', 14, finalY);

    const seizureTableData = Object.entries(seizureTotals)
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
      doc.text('Nenhum item apreendido.', 14, finalY + 10);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount} - Gerado automaticamente pelo Sistema DEC PCESP`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(`relatorio-dec-${currentDate.replace(/\//g, '-')}.pdf`);
    
    // Mark PDF as generated
    setPdfGenerated(true);
    setCanReset(true);
    
    toast.success('PDF gerado com sucesso!');
  };

  const handleReset = async () => {
    if (!canReset) {
      toast.error('Você precisa gerar o PDF antes de resetar os dados.');
      return;
    }
    
    if (confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.')) {
      // Delete all approved APFs
      const { error: apfError } = await supabase
        .from('apfs')
        .delete()
        .eq('status', 'approved');

      if (apfError) {
        toast.error('Erro ao resetar APFs');
        return;
      }

      await loadData();
      setCanReset(false);
      setPdfGenerated(false);
      toast.success('Dados resetados com sucesso!');
    }
  };

  const openDeleteModal = (type: 'police' | 'apf', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { type, id } = deleteTarget;

    if (type === 'police') {
      const { error } = await supabase
        .from('police_officers')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Erro ao excluir policial');
        return;
      }
    } else if (type === 'apf') {
      const { error } = await supabase
        .from('apfs')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Erro ao excluir APF');
        return;
      }
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
    toast.success('Registro excluído com sucesso!');
  };

  const openEditModal = (type: 'police' | 'apf', data: PoliceOfficer | APF) => {
    setEditTarget({ type, data });
    if (type === 'police') {
      setEditFormData(data as PoliceOfficer);
    } else {
      setEditApfFormData(data as APF);
    }
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!editTarget) return;

    const { type, data } = editTarget;

    if (type === 'police') {
      const { error } = await supabase
        .from('police_officers')
        .update({
          nome_completo: editFormData.nome_completo,
          rg: editFormData.rg,
          cargo: editFormData.cargo,
          status: editFormData.status,
        })
        .eq('id', data.id);

      if (error) {
        toast.error('Erro ao atualizar policial');
        return;
      }
      toast.success('Policial atualizado com sucesso!');
    } else if (type === 'apf') {
      const { error } = await supabase
        .from('apfs')
        .update({
          nome_individuo: editApfFormData.nome_individuo,
          rg_individuo: editApfFormData.rg_individuo,
          status: editApfFormData.status,
        })
        .eq('id', data.id);

      if (error) {
        toast.error('Erro ao atualizar APF');
        return;
      }
      toast.success('APF atualizado com sucesso!');
    }

    setShowEditModal(false);
    setEditTarget(null);
    setEditFormData({});
    setEditApfFormData({});
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

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
              Você não tem permissão para acessar a Chefia DEC.
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
            <h2 className="text-xl font-semibold">Chefia DEC</h2>
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

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Policiais</p>
              <p className="text-2xl font-bold font-mono">{approvedPolice.length}</p>
            </div>
          </div>
        </div>

        <div className="tactical-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-success/20">
              <FileText className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">APFs</p>
              <p className="text-2xl font-bold font-mono">{approvedApfs.length}</p>
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

      {!canReset && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Gere o PDF antes de resetar os dados.</span>
        </div>
      )}

      {canReset && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm">
          <Check className="w-4 h-4" />
          <span>PDF gerado! Você pode resetar os dados quando desejar.</span>
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
                {policiais.length} registros
              </span>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-tactical-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Cargo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">RG</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">APFs</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {policiais.map(p => (
                    <tr key={p.id} className="border-b border-tactical-border tactical-row">
                      <td className="p-3 font-medium">{p.nome_completo}</td>
                      <td className="p-3 text-muted-foreground">{p.cargo}</td>
                      <td className="p-3 font-mono text-muted-foreground">{p.rg}</td>
                      <td className="p-3 font-mono font-bold text-success">
                        {apfsByPolicial[p.nome_completo] || 0}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.status === 'approved' ? 'bg-success/20 text-success' :
                          p.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {p.status === 'approved' ? 'Aprovado' : p.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-center flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal('police', p)}
                          className="gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteModal('police', p.id, p.nome_completo)}
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
              <h3 className="font-semibold">APFs</h3>
              <span className="ml-auto text-sm text-muted-foreground">
                {apfs.length} registros
              </span>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-tactical-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Policial</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Indivíduo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Itens</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Dinheiro</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {apfs.map(a => {
                    const totalItens = Object.entries(a.itens)
                      .filter(([key]) => key !== 'dinheiroSujo')
                      .reduce((sum, [, value]) => sum + (value || 0), 0);
                    return (
                      <tr key={a.id} className="border-b border-tactical-border tactical-row">
                        <td className="p-3 font-medium">{a.policial_nome}</td>
                        <td className="p-3 text-muted-foreground">{a.nome_individuo}</td>
                        <td className="p-3 font-mono">{totalItens}</td>
                        <td className="p-3 font-mono text-warning">${a.itens.dinheiroSujo || 0}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            a.status === 'approved' ? 'bg-success/20 text-success' :
                            a.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                            'bg-warning/20 text-warning'
                          }`}>
                            {a.status === 'approved' ? 'Aprovado' : a.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDate(a.created_at)}</td>
                        <td className="p-3 text-center flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal('apf', a)}
                            className="gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDeleteModal('apf', a.id, `APF de ${a.policial_nome}`)}
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

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-card border-tactical-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar {editTarget?.type === 'police' ? 'Policial' : 'APF'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {editTarget?.type === 'police' && (
              <>
                <div>
                  <Label className="mb-2 block">Nome Completo</Label>
                  <Input
                    value={editFormData.nome_completo || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                    className="bg-input border-tactical-border"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">RG</Label>
                  <Input
                    value={editFormData.rg || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, rg: e.target.value.replace(/\D/g, '') }))}
                    className="bg-input border-tactical-border font-mono"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Cargo</Label>
                  <Select 
                    value={editFormData.cargo || ''} 
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, cargo: value }))}
                  >
                    <SelectTrigger className="bg-input border-tactical-border">
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_CARGOS.map(c => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Status</Label>
                  <Select 
                    value={editFormData.status || 'pending'} 
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-input border-tactical-border">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {editTarget?.type === 'apf' && (
              <>
                <div>
                  <Label className="mb-2 block">Nome do Indivíduo</Label>
                  <Input
                    value={editApfFormData.nome_individuo || ''}
                    onChange={(e) => setEditApfFormData(prev => ({ ...prev, nome_individuo: e.target.value }))}
                    className="bg-input border-tactical-border"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">RG do Indivíduo</Label>
                  <Input
                    value={editApfFormData.rg_individuo || ''}
                    onChange={(e) => setEditApfFormData(prev => ({ ...prev, rg_individuo: e.target.value.replace(/\D/g, '') }))}
                    className="bg-input border-tactical-border font-mono"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Status</Label>
                  <Select 
                    value={editApfFormData.status || 'pending'} 
                    onValueChange={(value) => setEditApfFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-input border-tactical-border">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmEdit}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};