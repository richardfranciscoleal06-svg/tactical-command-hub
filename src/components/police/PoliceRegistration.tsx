import { useState } from 'react';
import { CARGOS, CURSOS, Police } from '@/types/police';
import { addPolice } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { UserPlus, BadgeCheck, Calendar, Hash } from 'lucide-react';
import { toast } from 'sonner';

export const PoliceRegistration = () => {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [rg, setRg] = useState('');
  const [dataIngresso, setDataIngresso] = useState('');
  const [cargo, setCargo] = useState('');
  const [cursos, setCursos] = useState<string[]>([]);

  const handleRgChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '');
    setRg(numbersOnly);
  };

  const handleCursoToggle = (curso: string) => {
    if (curso === 'Nenhum') {
      setCursos(['Nenhum']);
    } else {
      setCursos(prev => {
        const filtered = prev.filter(c => c !== 'Nenhum');
        return filtered.includes(curso)
          ? filtered.filter(c => c !== curso)
          : [...filtered, curso];
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    if (!cargo) {
      toast.error('Cargo/Hierarquia é obrigatório');
      return;
    }
    if (cursos.length === 0) {
      toast.error('Selecione ao menos um curso ou "Nenhum"');
      return;
    }

    const police: Police = {
      id: crypto.randomUUID(),
      nomeCompleto: nomeCompleto.trim(),
      rg,
      dataIngresso,
      cargo,
      cursos,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    addPolice(police);
    
    // Reset form
    setNomeCompleto('');
    setRg('');
    setDataIngresso('');
    setCargo('');
    setCursos([]);

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
            />
          </div>
        </div>

        <div className="tactical-card p-6">
          <Label className="text-base font-medium mb-4 block">
            Hierarquia (Cargo)
          </Label>
          <Select value={cargo} onValueChange={setCargo}>
            <SelectTrigger className="bg-input border-tactical-border">
              <SelectValue placeholder="Selecione o cargo" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {CARGOS.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="tactical-card p-6">
          <Label className="text-base font-medium mb-4 block">
            Cursos
          </Label>
          <div className="space-y-3">
            {CURSOS.map(curso => (
              <label 
                key={curso}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  cursos.includes(curso)
                    ? 'border-primary bg-primary/10'
                    : 'border-tactical-border hover:border-primary/50'
                }`}
              >
                <Checkbox 
                  checked={cursos.includes(curso)}
                  onCheckedChange={() => handleCursoToggle(curso)}
                />
                <span className="font-medium">{curso}</span>
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full h-12 gap-2">
          <UserPlus className="w-5 h-5" />
          Enviar Cadastro para Aprovação
        </Button>
      </form>
    </div>
  );
};
