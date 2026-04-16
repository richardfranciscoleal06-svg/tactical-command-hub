import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CARGOS } from '@/types/police';
import { UserPlus, BadgeCheck, Calendar, Hash, Loader2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export const PoliceRegistration = () => {
  const { user } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [rg, setRg] = useState('');
  const [dataIngresso, setDataIngresso] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRgChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '');
    setRg(numbersOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Você precisa estar logado para cadastrar um policial');
      return;
    }

    if (!nomeCompleto.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }
    if (!rg.trim()) {
      toast.error('RG é obrigatório');
      return;
    }
    if (!dataIngresso) {
      toast.error('Data de ingresso é obrigatória');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('police_officers')
      .insert({
        user_id: user.id,
        nome_completo: nomeCompleto.trim(),
        rg,
        data_ingresso: dataIngresso,
        cargo: 'Agente Probatório',
        status: 'pending',
      });

    setLoading(false);

    if (error) {
      toast.error('Erro ao cadastrar policial: ' + error.message);
      return;
    }
    
    // Reset form
    setNomeCompleto('');
    setRg('');
    setDataIngresso('');

    toast.success('Cadastro enviado para aprovação!');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Registro Policial</h2>
          <p className="text-sm text-muted-foreground">Cadastre novos membros do departamento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="tactical-card p-6 space-y-4">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <BadgeCheck className="w-4 h-4 text-primary" />
              Nome Completo
            </Label>
            <Input
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Digite o nome completo"
              className="bg-input border-tactical-border"
              disabled={loading}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" />
              RG (somente números)
            </Label>
            <Input
              value={rg}
              onChange={(e) => handleRgChange(e.target.value)}
              placeholder="00000000"
              className="bg-input border-tactical-border font-mono"
              maxLength={12}
              disabled={loading}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              Data de Ingresso
            </Label>
            <Input
              type="date"
              value={dataIngresso}
              onChange={(e) => setDataIngresso(e.target.value)}
              className="bg-input border-tactical-border"
              disabled={loading}
            />
          </div>
        </div>

        <div className="tactical-card p-6">
          <Label className="text-base font-medium mb-2 block">
            Cargo
          </Label>
          <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border border-tactical-border">
            Agente Probatório
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Promoções podem ser feitas pela Chefia DEC.
          </p>
        </div>

        <Button type="submit" className="w-full h-12 gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
          Enviar Cadastro para Aprovação
        </Button>
      </form>
    </div>
  );
};