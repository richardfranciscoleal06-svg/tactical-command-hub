import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Car, Play, Square, Loader2, Clock, Users as UsersIcon, Hash, Shield, FileText, Camera, X, Upload, Package } from 'lucide-react';
import { toast } from 'sonner';
import { UNIDADES } from '@/types/police';

interface Patrol {
  id: string;
  user_id: string;
  policiais: string[];
  unidade: string;
  assinatura: string;
  senha_viatura: string;
  inicio_timestamp: string;
  fim_timestamp: string | null;
  horas_trabalhadas: number | null;
  status: string;
  relatorio?: string | null;
  itens?: Record<string, number> | null;
  imagens_ilicitos?: string[] | null;
}

interface Officer {
  id: string;
  nome_completo: string;
  rg: string;
  cargo: string;
}

const ITENS_LABELS: Record<string, string> = {
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

const defaultItens: Record<string, number> = Object.keys(ITENS_LABELS).reduce(
  (acc, k) => ({ ...acc, [k]: 0 }),
  {}
);

export const Patrulhamento = () => {
  const { user } = useAuth();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [unidade, setUnidade] = useState<string>('');
  const [assinatura, setAssinatura] = useState('');
  const [senhaViatura, setSenhaViatura] = useState('');
  const [endingPatrol, setEndingPatrol] = useState<Patrol | null>(null);
  const [relatorio, setRelatorio] = useState('');
  const [confirmSenhaViatura, setConfirmSenhaViatura] = useState('');
  const [submittingEnd, setSubmittingEnd] = useState(false);
  const [endItens, setEndItens] = useState<Record<string, number>>(defaultItens);
  const [endImagens, setEndImagens] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('patrols-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrols' }, () => loadPatrols())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    await Promise.all([loadOfficers(), loadPatrols()]);
  };

  const loadOfficers = async () => {
    const { data } = await supabase
      .from('police_officers')
      .select('id, nome_completo, rg, cargo')
      .eq('status', 'approved')
      .order('nome_completo');
    setOfficers(data || []);
  };

  const loadPatrols = async () => {
    const { data } = await supabase
      .from('patrols')
      .select('*')
      .order('inicio_timestamp', { ascending: false })
      .limit(50);
    setPatrols((data as unknown as Patrol[]) || []);
  };

  const togglePolicial = (id: string) => {
    setSelectedPoliciais(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const activeUnits = new Set(patrols.filter(p => p.status === 'active').map(p => p.unidade));

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedPoliciais.length === 0) return toast.error('Selecione ao menos um policial');
    if (!unidade) return toast.error('Selecione a unidade');
    if (!assinatura.trim()) return toast.error('Assinatura obrigatória');
    if (!senhaViatura.trim()) return toast.error('Senha da viatura obrigatória');
    if (activeUnits.has(unidade)) {
      return toast.error(`A unidade ${unidade} já está em rua. Aguarde o encerramento.`);
    }

    setLoading(true);
    const { error } = await supabase.from('patrols').insert({
      user_id: user.id,
      policiais: selectedPoliciais,
      unidade,
      assinatura: assinatura.trim(),
      senha_viatura: senhaViatura.trim(),
      status: 'active',
    });
    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        return toast.error(`A unidade ${unidade} já está em rua.`);
      }
      return toast.error('Erro: ' + error.message);
    }
    toast.success('Patrulha iniciada!');
    setSelectedPoliciais([]);
    setUnidade('');
    setAssinatura('');
    setSenhaViatura('');
  };

  const openEndDialog = (patrol: Patrol) => {
    setEndingPatrol(patrol);
    setRelatorio('');
    setConfirmSenhaViatura('');
    setEndItens(defaultItens);
    setEndImagens([]);
  };

  const handleItemChange = (key: string, value: string) => {
    const n = parseInt(value) || 0;
    setEndItens(prev => ({ ...prev, [key]: Math.max(0, n) }));
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploadingImg(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: não é uma imagem`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: máximo 5MB`);
        continue;
      }
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('patrol-ilicitos').upload(path, file);
      if (error) {
        toast.error(`Erro: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from('patrol-ilicitos').getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setEndImagens(prev => [...prev, ...uploaded]);
    setUploadingImg(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (url: string) => {
    setEndImagens(prev => prev.filter(u => u !== url));
  };

  const submitEnd = async () => {
    if (!endingPatrol) return;
    if (confirmSenhaViatura.trim() !== endingPatrol.senha_viatura) {
      toast.error('Senha da viatura incorreta.');
      return;
    }
    const trimmed = relatorio.trim();
    if (trimmed.length < 20) {
      toast.error('O relatório deve ter pelo menos 20 caracteres.');
      return;
    }
    if (trimmed.length > 2000) {
      toast.error('O relatório deve ter no máximo 2000 caracteres.');
      return;
    }

    setSubmittingEnd(true);
    const inicio = new Date(endingPatrol.inicio_timestamp).getTime();
    const horas = +((Date.now() - inicio) / 3600000).toFixed(2);

    const { error } = await supabase
      .from('patrols')
      .update({
        fim_timestamp: new Date().toISOString(),
        horas_trabalhadas: horas,
        status: 'pending',
        relatorio: trimmed,
        itens: endItens,
        imagens_ilicitos: endImagens,
      })
      .eq('id', endingPatrol.id);
    setSubmittingEnd(false);

    if (error) return toast.error('Erro: ' + error.message);
    toast.success(`Patrulha encerrada (${horas}h)`);
    setEndingPatrol(null);
  };

  const officerName = (id: string) => officers.find(o => o.id === id)?.nome_completo || id;
  const myActivePatrols = patrols.filter(p => p.user_id === user?.id && p.status === 'active');

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Car className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Patrulhamento</h2>
          <p className="text-sm text-muted-foreground">Registro de patrulhas em campo</p>
        </div>
      </div>

      <form onSubmit={handleStart} className="tactical-card p-6 space-y-4">
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <UsersIcon className="w-4 h-4 text-primary" />
            Policiais em Patrulha
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-tactical-border rounded-lg bg-input/40">
            {officers.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">Nenhum policial aprovado.</p>
            )}
            {officers.map(o => (
              <button
                type="button"
                key={o.id}
                onClick={() => togglePolicial(o.id)}
                className={`text-left text-sm px-3 py-2 rounded border transition-colors ${
                  selectedPoliciais.includes(o.id)
                    ? 'bg-primary/20 border-primary text-foreground'
                    : 'border-tactical-border hover:bg-muted/40'
                }`}
              >
                <div className="font-medium">{o.nome_completo}</div>
                <div className="text-xs text-muted-foreground font-mono">{o.cargo} • RG {o.rg}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" /> Unidade
            </Label>
            <Select value={unidade} onValueChange={setUnidade} disabled={loading}>
              <SelectTrigger className="bg-input border-tactical-border">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {UNIDADES.map(u => (
                  <SelectItem key={u} value={u} disabled={activeUnits.has(u)}>
                    {u}{activeUnits.has(u) ? ' (em rua)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" /> Senha da Viatura
            </Label>
            <Input
              type="password"
              value={senhaViatura}
              onChange={(e) => setSenhaViatura(e.target.value)}
              className="bg-input border-tactical-border font-mono"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label className="mb-2 block">Assinatura do Responsável</Label>
            <Input
              value={assinatura}
              onChange={(e) => setAssinatura(e.target.value)}
              className="bg-input border-tactical-border"
              disabled={loading}
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 gap-2" disabled={loading}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          Iniciar Patrulha
        </Button>
      </form>

      {myActivePatrols.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">SUAS PATRULHAS ATIVAS</h3>
          {myActivePatrols.map(p => (
            <Card key={p.id} className="p-4 border-success/40 bg-success/5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-success text-success">ATIVA</Badge>
                    <span className="text-sm font-mono">Unidade {p.unidade}</span>
                  </div>
                  <p className="text-sm">{p.policiais.map(officerName).join(', ')}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Início: {new Date(p.inicio_timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button onClick={() => openEndDialog(p)} variant="destructive" size="sm" className="gap-2">
                  <FileText className="w-4 h-4" /> Encerrar e enviar relatório
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">HISTÓRICO RECENTE</h3>
        {patrols.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma patrulha registrada.</p>
        )}
        {patrols.filter(p => p.status !== 'active').slice(0, 20).map(p => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === 'approved' ? 'default' : p.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {p.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-mono">Unidade {p.unidade}</span>
                </div>
                <p className="text-sm">{p.policiais.map(officerName).join(', ')}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.inicio_timestamp).toLocaleString('pt-BR')} →{' '}
                  {p.fim_timestamp ? new Date(p.fim_timestamp).toLocaleString('pt-BR') : '—'}
                  {p.horas_trabalhadas !== null && ` • ${p.horas_trabalhadas}h`}
                </p>
                {p.relatorio && (
                  <p className="text-xs text-foreground/80 mt-2 p-2 rounded bg-muted/40 border border-tactical-border whitespace-pre-wrap">
                    <span className="font-semibold">Relatório:</span> {p.relatorio}
                  </p>
                )}
                {p.imagens_ilicitos && p.imagens_ilicitos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {p.imagens_ilicitos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Ilícito ${i+1}`} className="w-16 h-16 object-cover rounded border border-tactical-border" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!endingPatrol} onOpenChange={(open) => !open && setEndingPatrol(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Encerrar Patrulhamento
            </DialogTitle>
            <DialogDescription>
              Informe a senha da viatura, escreva um breve relatório, registre os ilícitos apreendidos e anexe imagens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                Senha da Viatura (confirmação)
              </Label>
              <Input
                type="password"
                value={confirmSenhaViatura}
                onChange={(e) => setConfirmSenhaViatura(e.target.value)}
                placeholder="Digite a senha da viatura"
                className="bg-input border-tactical-border font-mono"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label>Relatório do patrulhamento *</Label>
              <Textarea
                value={relatorio}
                onChange={(e) => setRelatorio(e.target.value)}
                placeholder="Descreva ocorrências, áreas patrulhadas, abordagens realizadas, etc."
                rows={5}
                maxLength={2000}
                className="bg-input border-tactical-border"
              />
              <p className="text-xs text-muted-foreground text-right">
                {relatorio.trim().length}/2000 (mínimo 20)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Itens Ilícitos Apreendidos
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border border-tactical-border rounded-lg bg-input/40 max-h-64 overflow-y-auto">
                {Object.entries(ITENS_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={endItens[key]}
                      onChange={(e) => handleItemChange(key, e.target.value)}
                      className="mt-1 h-8 bg-input border-tactical-border font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Imagens dos ilícitos
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUploadImages(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImg}
                className="gap-2 w-full"
              >
                {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Enviar imagens
              </Button>
              {endImagens.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {endImagens.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Img ${i+1}`} className="w-20 h-20 object-cover rounded border border-tactical-border" />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndingPatrol(null)} disabled={submittingEnd}>
              Cancelar
            </Button>
            <Button onClick={submitEnd} disabled={submittingEnd} className="gap-2">
              {submittingEnd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Encerrar patrulha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
