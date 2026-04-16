import { useState, useEffect } from 'react';
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
import { Car, Play, Square, Loader2, Clock, Users as UsersIcon, Hash, Shield, FileText } from 'lucide-react';
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
}

interface Officer {
  id: string;
  nome_completo: string;
  rg: string;
  cargo: string;
}

export const Patrulhamento = () => {
  const { user } = useAuth();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [unidade, setUnidade] = useState<string>('');
  const [assinatura, setAssinatura] = useState('');
  const [senhaViatura, setSenhaViatura] = useState('');

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
    setPatrols((data as Patrol[]) || []);
  };

  const togglePolicial = (id: string) => {
    setSelectedPoliciais(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedPoliciais.length === 0) return toast.error('Selecione ao menos um policial');
    if (!unidade) return toast.error('Selecione a unidade');
    if (!assinatura.trim()) return toast.error('Assinatura obrigatória');
    if (!senhaViatura.trim()) return toast.error('Senha da viatura obrigatória');

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

    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Patrulha iniciada!');
    setSelectedPoliciais([]);
    setUnidade('');
    setAssinatura('');
    setSenhaViatura('');
  };

  const handleEnd = async (patrol: Patrol) => {
    const inicio = new Date(patrol.inicio_timestamp).getTime();
    const agora = Date.now();
    const horas = +((agora - inicio) / 3600000).toFixed(2);

    const { error } = await supabase
      .from('patrols')
      .update({
        fim_timestamp: new Date().toISOString(),
        horas_trabalhadas: horas,
        status: 'pending',
      })
      .eq('id', patrol.id);

    if (error) return toast.error('Erro: ' + error.message);
    toast.success(`Patrulha encerrada (${horas}h)`);
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
                {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" /> Senha da Viatura
            </Label>
            <Input
              value={senhaViatura}
              onChange={(e) => setSenhaViatura(e.target.value)}
              className="bg-input border-tactical-border font-mono"
              disabled={loading}
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
                    <span className="text-sm font-mono">Unidade {p.unidade} • Viatura {p.senha_viatura}</span>
                  </div>
                  <p className="text-sm">{p.policiais.map(officerName).join(', ')}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Início: {new Date(p.inicio_timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button onClick={() => handleEnd(p)} variant="destructive" size="sm" className="gap-2">
                  <Square className="w-4 h-4" /> Encerrar
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
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === 'approved' ? 'default' : p.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {p.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-mono">Unidade {p.unidade} • Viatura {p.senha_viatura}</span>
                </div>
                <p className="text-sm">{p.policiais.map(officerName).join(', ')}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.inicio_timestamp).toLocaleString('pt-BR')} →{' '}
                  {p.fim_timestamp ? new Date(p.fim_timestamp).toLocaleString('pt-BR') : '—'}
                  {p.horas_trabalhadas !== null && ` • ${p.horas_trabalhadas}h`}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
