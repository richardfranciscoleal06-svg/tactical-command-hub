import { useState, useEffect } from 'react';
import { Police, Seizure } from '@/types/police';
import { getApprovedPolice, getPoliciesOnDuty, addSeizure } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Package, Send, AlertTriangle, Camera } from 'lucide-react';
import { toast } from 'sonner';

const ITENS_LABELS = {
  sementeCannabis: 'Semente de Cannabis',
  cannabisNatura: 'Cannabis in natura',
  fenilacetona: 'Fenilacetona',
  acidoCloridrico: 'Ácido clorídrico',
  metilamina: 'Metilamina',
  maconha: 'Maconha',
  metanfetamina: 'Metanfetamina',
  pecasArmas: 'Peças de Armas',
  fuzil: 'Fuzil',
  submetralhadora: 'Submetralhadora',
  pistola: 'Pistola',
  municoes762: 'Munições 762mm',
  municoes556: 'Munições 556mm',
  municoes9mm: 'Munições 9mm',
  dinheiroSujo: 'Dinheiro sujo',
  coleteBalístico: 'Colete Balístico',
  lockpick: 'Lockpick',
  flipperZero: 'Flipper Zero',
  kevlar: 'Kevlar',
};

const defaultItens = {
  sementeCannabis: 0,
  cannabisNatura: 0,
  fenilacetona: 0,
  acidoCloridrico: 0,
  metilamina: 0,
  maconha: 0,
  metanfetamina: 0,
  pecasArmas: 0,
  fuzil: 0,
  submetralhadora: 0,
  pistola: 0,
  municoes762: 0,
  municoes556: 0,
  municoes9mm: 0,
  dinheiroSujo: 0,
  coleteBalístico: 0,
  lockpick: 0,
  flipperZero: 0,
  kevlar: 0,
};

export const SeizureReport = () => {
  const [policiais, setPoliciais] = useState<Police[]>([]);
  const [policiaisEmServico, setPoliciaisEmServico] = useState<string[]>([]);
  const [selectedPolicial, setSelectedPolicial] = useState<string>('');
  const [itens, setItens] = useState(defaultItens);
  const [urlComprovacao, setUrlComprovacao] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const approved = getApprovedPolice();
    const onDuty = getPoliciesOnDuty();
    setPoliciais(approved);
    setPoliciaisEmServico(onDuty);
  };

  const handleItemChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setItens(prev => ({ ...prev, [key]: Math.max(0, numValue) }));
  };

  const handleSubmit = () => {
    if (!selectedPolicial) {
      toast.error('Selecione um policial');
      return;
    }

    const policial = policiais.find(p => p.id === selectedPolicial);
    if (!policial) return;

    const totalItens = Object.values(itens).reduce((a, b) => a + b, 0);
    if (totalItens === 0) {
      toast.error('Adicione ao menos um item apreendido');
      return;
    }

    if (!urlComprovacao.trim()) {
      toast.error('URL de comprovação é obrigatória');
      return;
    }

    const seizure: Seizure = {
      id: crypto.randomUUID(),
      policialId: selectedPolicial,
      policialNome: policial.nomeCompleto,
      itens,
      urlComprovacao,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    addSeizure(seizure);
    setItens(defaultItens);
    setUrlComprovacao('');
    setSelectedPolicial('');
    toast.success('Apreensão enviada para aprovação!');
  };

  const policiaisDisponiveis = policiais.filter(p => 
    policiaisEmServico.includes(p.id)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Relatório de Apreensão</h2>
          <p className="text-sm text-muted-foreground">Registre itens apreendidos em operações</p>
        </div>
      </div>

      {policiaisDisponiveis.length === 0 && (
        <div className="tactical-card p-4 border-l-4 border-l-warning">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <p className="text-sm">
              Nenhum policial em serviço. Inicie um patrulhamento primeiro.
            </p>
          </div>
        </div>
      )}

      <div className="tactical-card p-6">
        <Label className="text-base font-medium mb-4 block">
          Policial Responsável (em serviço)
        </Label>
        <Select value={selectedPolicial} onValueChange={setSelectedPolicial}>
          <SelectTrigger className="bg-input border-tactical-border">
            <SelectValue placeholder="Selecione o policial" />
          </SelectTrigger>
          <SelectContent>
            {policiaisDisponiveis.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.nomeCompleto} - {p.cargo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-primary">Drogas</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(ITENS_LABELS).slice(0, 7).map(([key, label]) => (
            <div key={key} className="tactical-card p-4">
              <Label className="text-sm text-muted-foreground">{label}</Label>
              <Input
                type="number"
                min="0"
                value={itens[key as keyof typeof itens]}
                onChange={(e) => handleItemChange(key, e.target.value)}
                className="mt-1.5 bg-input border-tactical-border font-mono"
              />
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-primary mt-4">Armas/Peças</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(ITENS_LABELS).slice(7, 11).map(([key, label]) => (
            <div key={key} className="tactical-card p-4">
              <Label className="text-sm text-muted-foreground">{label}</Label>
              <Input
                type="number"
                min="0"
                value={itens[key as keyof typeof itens]}
                onChange={(e) => handleItemChange(key, e.target.value)}
                className="mt-1.5 bg-input border-tactical-border font-mono"
              />
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-primary mt-4">Munições</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(ITENS_LABELS).slice(11, 14).map(([key, label]) => (
            <div key={key} className="tactical-card p-4">
              <Label className="text-sm text-muted-foreground">{label}</Label>
              <Input
                type="number"
                min="0"
                value={itens[key as keyof typeof itens]}
                onChange={(e) => handleItemChange(key, e.target.value)}
                className="mt-1.5 bg-input border-tactical-border font-mono"
              />
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-primary mt-4">Outros</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(ITENS_LABELS).slice(14).map(([key, label]) => (
            <div key={key} className="tactical-card p-4">
              <Label className="text-sm text-muted-foreground">{label}</Label>
              <Input
                type="number"
                min="0"
                value={itens[key as keyof typeof itens]}
                onChange={(e) => handleItemChange(key, e.target.value)}
                className="mt-1.5 bg-input border-tactical-border font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="tactical-card p-6">
        <Label className="flex items-center gap-2 text-base font-medium mb-4">
          <Camera className="w-5 h-5" />
          Comprovação (URL da imagem)
        </Label>
        <Input
          type="url"
          value={urlComprovacao}
          onChange={(e) => setUrlComprovacao(e.target.value)}
          placeholder="https://imgur.com/..."
          className="bg-input border-tactical-border"
        />
      </div>

      <Button 
        onClick={handleSubmit}
        className="w-full h-12 gap-2"
        disabled={!selectedPolicial}
      >
        <Send className="w-5 h-5" />
        Enviar para Aprovação
      </Button>
    </div>
  );
};
