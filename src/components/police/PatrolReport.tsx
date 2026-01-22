import { useState, useEffect } from 'react';
import { UNIDADES, Police, Patrol } from '@/types/police';
import { getApprovedPolice, getPatrols, addPatrol, updatePatrol } from '@/lib/storage';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Play, Square, Clock, Users, AlertTriangle, Car, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

export const PatrolReport = () => {
  const [policiais, setPoliciais] = useState<Police[]>([]);
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [unidade, setUnidade] = useState<string>('');
  const [activePatrols, setActivePatrols] = useState<Patrol[]>([]);
  
  // Modal states
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [assinatura, setAssinatura] = useState('');
  const [senhaViatura, setSenhaViatura] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaEncerramento, setSenhaEncerramento] = useState('');
  
  // Seleção de patrulha para finalizar
  const [selectedPatrolToEnd, setSelectedPatrolToEnd] = useState<Patrol | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPoliciais(getApprovedPolice());
    const patrols = getPatrols();
    const active = patrols.filter(p => p.status === 'active');
    setActivePatrols(active);
  };

  const handlePoliceToggle = (id: string) => {
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
    
    // Verificar se a unidade já está em uso
    const unidadeEmUso = activePatrols.find(p => p.unidade === unidade);
    if (unidadeEmUso) {
      toast.error(`Unidade ${unidade} já está em patrulhamento`);
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
    setShowStartModal(false);
    setAssinatura('');
    setSenhaViatura('');
    setConfirmarSenha('');
    setSelectedPoliciais([]);
    setUnidade('');
    loadData();
    toast.success('Patrulhamento iniciado com sucesso!');
  };

  const handleSelectPatrolToEnd = (patrol: Patrol) => {
    setSelectedPatrolToEnd(patrol);
    setShowEndModal(true);
  };

  const confirmEndPatrol = () => {
    if (!selectedPatrolToEnd) return;
    
    if (senhaEncerramento !== selectedPatrolToEnd.senhaViatura) {
      toast.error('Senha incorreta! Não foi possível encerrar o ponto.');
      setSenhaEncerramento('');
      return;
    }

    const fimTimestamp = new Date().toISOString();
    const inicio = new Date(selectedPatrolToEnd.inicioTimestamp);
    const fim = new Date(fimTimestamp);
    const horasTrabalhadas = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);

    updatePatrol(selectedPatrolToEnd.id, {
      fimTimestamp,
      horasTrabalhadas: Math.round(horasTrabalhadas * 100) / 100,
      status: 'pending',
    });

    setSelectedPatrolToEnd(null);
    setShowEndModal(false);
    setSenhaEncerramento('');
    loadData();
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

  // Filtrar unidades disponíveis (não em uso)
  const unidadesDisponiveis = UNIDADES.filter(
    u => !activePatrols.find(p => p.unidade === u)
  );

  // Policiais que não estão em patrulha ativa
  const policiaisDisponiveis = policiais.filter(p => {
    return !activePatrols.some(patrol => patrol.policiais.includes(p.id));
  });

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

      <Tabs defaultValue="iniciar" className="space-y-4">
        <TabsList className="bg-muted/50 border border-tactical-border">
          <TabsTrigger value="iniciar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Play className="w-4 h-4" />
            Iniciar Patrulhamento
          </TabsTrigger>
          <TabsTrigger value="finalizar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <StopCircle className="w-4 h-4" />
            Finalizar Patrulhamento
            {activePatrols.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-warning text-warning-foreground">
                {activePatrols.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="iniciar" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="tactical-card p-6">
              <Label className="text-base font-medium mb-4 block">
                Selecionar Policiais
              </Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {policiaisDisponiveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {policiais.length === 0 
                      ? 'Nenhum policial cadastrado/aprovado'
                      : 'Todos os policiais já estão em patrulha'}
                  </p>
                ) : (
                  policiaisDisponiveis.map(p => (
                    <label 
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedPoliciais.includes(p.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-tactical-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox 
                        checked={selectedPoliciais.includes(p.id)}
                        onCheckedChange={() => handlePoliceToggle(p.id)}
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
              >
                <SelectTrigger className="bg-input border-tactical-border">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesDisponiveis.map(u => (
                    <SelectItem key={u} value={u}>
                      Unidade {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {unidadesDisponiveis.length === 0 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Todas as unidades estão em patrulhamento
                </p>
              )}

              <div className="mt-6">
                <Button 
                  onClick={handleStartPatrol}
                  className="w-full gap-2 h-12"
                  disabled={selectedPoliciais.length === 0 || !unidade}
                >
                  <Play className="w-5 h-5" />
                  Iniciar Ponto
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="finalizar" className="space-y-4">
          {activePatrols.length === 0 ? (
            <div className="tactical-card p-8 text-center text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma unidade em patrulhamento no momento</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activePatrols.map(patrol => (
                <div 
                  key={patrol.id} 
                  className="tactical-card p-4 border-l-4 border-l-success"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-success/20">
                        <Car className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Unidade {patrol.unidade}</p>
                        <p className="text-sm text-muted-foreground">
                          Assinatura: {patrol.assinatura}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          Tempo em serviço: {formatDuration(patrol.inicioTimestamp)}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleSelectPatrolToEnd(patrol)}
                      variant="destructive"
                      className="gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Finalizar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Start Patrol Modal */}
      <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
        <DialogContent className="bg-card border-tactical-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Iniciar Patrulhamento - Unidade {unidade}
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
              <p className="text-xs text-muted-foreground mt-1">
                Esta senha será necessária para finalizar o patrulhamento desta unidade
              </p>
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
              Encerrar Patrulhamento - Unidade {selectedPatrolToEnd?.unidade}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">
                Digite a senha definida no início do patrulhamento desta unidade para encerrar.
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
            <Button variant="outline" onClick={() => {
              setShowEndModal(false);
              setSelectedPatrolToEnd(null);
              setSenhaEncerramento('');
            }}>
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
