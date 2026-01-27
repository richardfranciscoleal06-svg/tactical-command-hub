import { useState, useEffect } from 'react';
import { Police, Seizure, ARTIGOS_PENAIS } from '@/types/police';
import { getApprovedPolice, addSeizure } from '@/lib/storage';
import { isValidUrl } from '@/lib/urlValidator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FileText, Send, Camera, Clock, User, Scale } from 'lucide-react';
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

export const APFReport = () => {
  const [policiais, setPoliciais] = useState<Police[]>([]);
  const [selectedPolicial, setSelectedPolicial] = useState<string>('');
  
  // Novos campos
  const [policiaisQru, setPoliciaisQru] = useState('');
  const [nomeIndividuo, setNomeIndividuo] = useState('');
  const [rgIndividuo, setRgIndividuo] = useState('');
  const [informacoesQru, setInformacoesQru] = useState('');
  const [artigosSelecionados, setArtigosSelecionados] = useState<string[]>([]);
  
  const [itens, setItens] = useState(defaultItens);
  const [urlComprovacao, setUrlComprovacao] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const approved = getApprovedPolice();
    setPoliciais(approved);
  };

  const handleItemChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setItens(prev => ({ ...prev, [key]: Math.max(0, numValue) }));
  };

  const handleArtigoToggle = (codigo: string) => {
    const artigo = ARTIGOS_PENAIS.find(a => a.codigo === codigo);
    if (!artigo) return;

    // Se é artigo único e está sendo selecionado
    if (artigo.artigoUnico) {
      if (artigosSelecionados.includes(codigo)) {
        setArtigosSelecionados([]);
      } else {
        setArtigosSelecionados([codigo]);
      }
    } else {
      // Se já tem um artigo único selecionado, não permitir adicionar outros
      const hasArtigoUnico = artigosSelecionados.some(
        cod => ARTIGOS_PENAIS.find(a => a.codigo === cod)?.artigoUnico
      );
      
      if (hasArtigoUnico) {
        toast.error('Remova o artigo único antes de selecionar outros artigos');
        return;
      }

      setArtigosSelecionados(prev => 
        prev.includes(codigo)
          ? prev.filter(c => c !== codigo)
          : [...prev, codigo]
      );
    }
  };

  const calcularTempoPrisao = () => {
    return artigosSelecionados.reduce((total, codigo) => {
      const artigo = ARTIGOS_PENAIS.find(a => a.codigo === codigo);
      return total + (artigo?.tempo || 0);
    }, 0);
  };

  const formatarTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const handleSubmit = () => {
    if (!selectedPolicial) {
      toast.error('Selecione um policial responsável');
      return;
    }

    if (!nomeIndividuo.trim()) {
      toast.error('Nome do indivíduo é obrigatório');
      return;
    }

    if (!rgIndividuo.trim()) {
      toast.error('RG do indivíduo é obrigatório');
      return;
    }

    if (!informacoesQru.trim()) {
      toast.error('Informações da QRU são obrigatórias');
      return;
    }

    if (artigosSelecionados.length === 0) {
      toast.error('Selecione ao menos um artigo da prisão');
      return;
    }

    if (!urlComprovacao.trim()) {
      toast.error('URL de comprovação é obrigatória');
      return;
    }

    if (!isValidUrl(urlComprovacao)) {
      toast.error('URL inválida. Use apenas links HTTPS válidos.');
      return;
    }

    const policial = policiais.find(p => p.id === selectedPolicial);
    if (!policial) return;

    const tempoPrisao = calcularTempoPrisao();

    const seizure: Seizure = {
      id: crypto.randomUUID(),
      policialId: selectedPolicial,
      policialNome: policial.nomeCompleto,
      policiaisQru: policiaisQru.trim() || undefined,
      nomeIndividuo: nomeIndividuo.trim(),
      rgIndividuo: rgIndividuo.trim(),
      informacoesQru: informacoesQru.trim(),
      artigos: artigosSelecionados,
      tempoPrisao,
      itens,
      urlComprovacao,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    addSeizure(seizure);
    
    // Reset form
    setItens(defaultItens);
    setUrlComprovacao('');
    setSelectedPolicial('');
    setPoliciaisQru('');
    setNomeIndividuo('');
    setRgIndividuo('');
    setInformacoesQru('');
    setArtigosSelecionados([]);
    
    toast.success('APF enviado para aprovação!');
  };

  const tempoPrisao = calcularTempoPrisao();

  // Verificar se algum artigo único está selecionado
  const artigoUnicoSelecionado = artigosSelecionados.some(
    cod => ARTIGOS_PENAIS.find(a => a.codigo === cod)?.artigoUnico
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
      <h2 className="text-xl font-semibold">Auto de Prisão em Flagrante (APF)</h2>
          <p className="text-sm text-muted-foreground">Registre prisões e apreensões em operações</p>
        </div>
      </div>

      {policiais.length === 0 && (
        <div className="tactical-card p-4 border-l-4 border-l-warning">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-warning" />
            <p className="text-sm">
              Nenhum policial cadastrado. Cadastre um policial primeiro.
            </p>
          </div>
        </div>
      )}

      {/* Policial Responsável */}
      <div className="tactical-card p-6">
        <Label className="text-base font-medium mb-4 block">
          Policial Responsável
        </Label>
        <Select value={selectedPolicial} onValueChange={setSelectedPolicial}>
          <SelectTrigger className="bg-input border-tactical-border">
            <SelectValue placeholder="Selecione o policial" />
          </SelectTrigger>
          <SelectContent>
            {policiais.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.nomeCompleto} - {p.cargo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Policiais que trouxeram a QRU (opcional) */}
      <div className="tactical-card p-6">
        <Label className="text-base font-medium mb-2 block flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Policiais que trouxeram a QRU (opcional)
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          Nome e RG dos policiais que trouxeram a ocorrência
        </p>
        <Textarea
          value={policiaisQru}
          onChange={(e) => setPoliciaisQru(e.target.value)}
          placeholder="Ex: João Silva (RG: 12345678), Maria Santos (RG: 87654321)"
          className="bg-input border-tactical-border min-h-[80px]"
        />
      </div>

      {/* Dados do Indivíduo Apreendido */}
      <div className="tactical-card p-6">
        <Label className="text-base font-medium mb-4 block flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Dados do Indivíduo Apreendido *
        </Label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Nome Completo *</Label>
            <Input
              value={nomeIndividuo}
              onChange={(e) => setNomeIndividuo(e.target.value)}
              placeholder="Nome do indivíduo"
              className="mt-1.5 bg-input border-tactical-border"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">RG *</Label>
            <Input
              value={rgIndividuo}
              onChange={(e) => setRgIndividuo(e.target.value.replace(/\D/g, ''))}
              placeholder="Somente números"
              className="mt-1.5 bg-input border-tactical-border font-mono"
            />
          </div>
        </div>
      </div>

      {/* Informações da QRU */}
      <div className="tactical-card p-6">
        <Label className="text-base font-medium mb-2 block flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Informações da QRU *
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          Descreva o que ocorreu na ocorrência
        </p>
        <Textarea
          value={informacoesQru}
          onChange={(e) => setInformacoesQru(e.target.value)}
          placeholder="Descreva detalhadamente o que ocorreu na ocorrência..."
          className="bg-input border-tactical-border min-h-[120px]"
        />
      </div>

      {/* Artigos da Prisão */}
      <div className="tactical-card p-6">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Artigos da Prisão *
          </Label>
          {tempoPrisao > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-mono font-bold text-primary">
                Tempo: {formatarTempo(tempoPrisao)}
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {ARTIGOS_PENAIS.map(artigo => {
            const isSelected = artigosSelecionados.includes(artigo.codigo);
            const isDisabled = artigoUnicoSelecionado && !isSelected && !artigo.artigoUnico;
            
            return (
              <label 
                key={artigo.codigo}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? artigo.artigoUnico 
                      ? 'border-warning bg-warning/10'
                      : 'border-primary bg-primary/10'
                    : isDisabled
                      ? 'border-tactical-border opacity-50 cursor-not-allowed'
                      : 'border-tactical-border hover:border-primary/50'
                }`}
              >
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => handleArtigoToggle(artigo.codigo)}
                  disabled={isDisabled}
                />
                <div className="flex-1">
                  <p className="font-medium">
                    {artigo.codigo} - {artigo.descricao}
                    {artigo.artigoUnico && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-warning/20 text-warning">
                        Artigo Único
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Tempo: {formatarTempo(artigo.tempo)}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Itens Apreendidos */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-primary">Itens Apreendidos</h3>
        
        <h4 className="text-md font-medium text-muted-foreground">Drogas</h4>
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

        <h4 className="text-md font-medium text-muted-foreground mt-4">Armas/Peças</h4>
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

        <h4 className="text-md font-medium text-muted-foreground mt-4">Munições</h4>
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

        <h4 className="text-md font-medium text-muted-foreground mt-4">Outros</h4>
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

      {/* Comprovação */}
      <div className="tactical-card p-6">
        <Label className="flex items-center gap-2 text-base font-medium mb-4">
          <Camera className="w-5 h-5" />
          Comprovação (URL da imagem) *
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
        Enviar APF para Aprovação
      </Button>
    </div>
  );
};
