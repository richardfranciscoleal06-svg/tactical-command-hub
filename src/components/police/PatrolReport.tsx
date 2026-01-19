import { useState, useEffect } from 'react';
import { UNIDADES, Police, Patrol } from '@/types/police';
import { getApprovedPolice, getPatrols, addPatrol, updatePatrol, getActivePatrol } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Play, Square, Clock, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const PatrolReport = () => {
  const [policiais, setPoliciais] = useState<Police[]>([]);
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [unidade, setUnidade] = useState<string>('');
  const [activePatrol, setActivePatrol] = useState<Patrol | null>(null);
  
  // Modal states
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [assinatura, setAssinatura] = useState('');
  const [senhaViatura, setSenhaViatura] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaEncerramento, setSenhaEncerramento] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPoliciais(getApprovedPolice());
    // Check for active patrol
    const patrols = getPatrols();
    const active = patrols.find(p => p.status === 'active');
    setActivePatrol(active || null);
    if (active) {
      setSelectedPoliciais(active.policiais);
      setUnidade(active.unidade);
    }
  };

  const handlePoliceToggle = (id: string) => {
    if (activePatrol) return;
    setSelectedPoliciais(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleStartPatrol = () => {
    if (selectedPoliciais.length === 0) {
      toast.error('Selecione ao menos um policial');
      return;
    }
    if (!unidade) {
      toast.error('Selecione uma unidade');
      return;
    }
    setShowStartModal(true);
  };

  const confirmStartPatrol = () => {
    if (!assinatura.trim()) {
      toast.error('Assinatura é obrigatória');
      return;
    }
    if (!senhaViatura.trim()) {
      toast.error('Senha da viatura é obrigatória');
      return;
    }
    if (senhaViatura !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    const patrol: Patrol = {
      id: crypto.randomUUID(),
      policiais: selectedPoliciais,
      unidade,
      assinatura,
      senhaViatura,
      inicioTimestamp: new Date().toISOString(),
      status: 'active',
    };

    addPatrol(patrol);
    setActivePatrol(patrol);
    setShowStartModal(false);
    setAssinatura('');
    setSenhaViatura('');
    setConfirmarSenha('');
    toast.success('Patrulhamento iniciado com sucesso!');
  };

  const handleEndPatrol = () => {
    if (!activePatrol) return;
    setShowEndModal(true);
  };

  const confirmEndPatrol = () => {
    if (!activePatrol) return;
    
    if (senhaEncerramento !== activePatrol.senhaViatura) {
      toast.error('Senha incorreta! Não foi possível encerrar o ponto.');
      setSenhaEncerramento('');
      return;
    }

    const fimTimestamp = new Date().toISOString();
    const inicio = new Date(activePatrol.inicioTimestamp);
    const fim = new Date(fimTimestamp);
    const horasTrabalhadas = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);

    updatePatrol(activePatrol.id, {
      fimTimestamp,
      horasTrabalhadas: Math.round(horasTrabalhadas * 100) / 100,
      status: 'pending',
    });

    setActivePatrol(null);
    setSelectedPoliciais([]);
    setUnidade('');
    setShowEndModal(false);
    setSenhaEncerramento('');
    toast.success('Patrulhamento encerrado! Enviado para aprovação.');
  };

  const formatDuration = (start: string) => {
    const inicio = new Date(start);
    const agora = new Date();
    const diff = agora.getTime() - inicio.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Relatório de Patrulhamento</h2>
          <p className="text-sm text-muted-foreground">Gerencie os turnos de patrulha</p>
        </div>
      </div>

      {activePatrol && (
        <div className="tactical-card p-4 border-l-4 border-l-success animate-glow-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-success" />
              <div>
                <p className="font-semibold text-success">Patrulha Ativa</p>
                <p className="text-sm text-muted-foreground font-mono">
                  Unidade {activePatrol.unidade} • Tempo: {formatDuration(activePatrol.inicioTimestamp)}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleEndPatrol}
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Encerrar Ponto
            </Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="tactical-card p-6">
          <Label className="text-base font-medium mb-4 block">
            Selecionar Policiais
          </Label>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {policiais.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum policial cadastrado/aprovado
              </p>
            ) : (
              policiais.map(p => (
                <label 
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedPoliciais.includes(p.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-tactical-border hover:border-primary/50'
                  } ${activePatrol ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Checkbox 
                    checked={selectedPoliciais.includes(p.id)}
                    onCheckedChange={() => handlePoliceToggle(p.id)}
                    disabled={!!activePatrol}
                  />
                  <div>
                    <p className="font-medium">{p.nomeCompleto}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {p.cargo} • RG: {p.rg}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="tactical-card p-6">
          <Label className="text-base font-medium mb-4 block">
            Unidade de Patrulha
          </Label>
          <Select 
            value={unidade} 
            onValueChange={setUnidade}
            disabled={!!activePatrol}
          >
            <SelectTrigger className="bg-input border-tactical-border">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES.map(u => (
                <SelectItem key={u} value={u}>
                  Unidade {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mt-6">
            {!activePatrol ? (
              <Button 
                onClick={handleStartPatrol}
                className="w-full gap-2 h-12"
                disabled={selectedPoliciais.length === 0 || !unidade}
              >
                <Play className="w-5 h-5" />
                Iniciar Ponto
              </Button>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-warning" />
                Patrulha em andamento. Encerre o ponto para iniciar outra.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Patrol Modal */}
      <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
        <DialogContent className="bg-card border-tactical-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Iniciar Patrulhamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Assinatura (Responsável pela viatura)</Label>
              <Input
                value={assinatura}
                onChange={(e) => setAssinatura(e.target.value)}
                placeholder="Nome completo"
                className="mt-1.5 bg-input border-tactical-border"
              />
            </div>
            <div>
              <Label>Criar Senha da Viatura</Label>
              <Input
                type="password"
                value={senhaViatura}
                onChange={(e) => setSenhaViatura(e.target.value)}
                placeholder="Senha temporária"
                className="mt-1.5 bg-input border-tactical-border"
              />
            </div>
            <div>
              <Label>Confirmar Senha</Label>
              <Input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme a senha"
                className="mt-1.5 bg-input border-tactical-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartModal(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmStartPatrol} className="gap-2">
              <Play className="w-4 h-4" />
              Confirmar Início
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Patrol Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="bg-card border-tactical-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="w-5 h-5 text-destructive" />
              Encerrar Patrulhamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">
                Digite a senha definida no início do patrulhamento para encerrar.
              </p>
            </div>
            <div>
              <Label>Senha da Viatura</Label>
              <Input
                type="password"
                value={senhaEncerramento}
                onChange={(e) => setSenhaEncerramento(e.target.value)}
                placeholder="Digite a senha"
                className="mt-1.5 bg-input border-tactical-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmEndPatrol} 
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Encerrar Ponto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
