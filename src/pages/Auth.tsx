import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().trim().min(3, { message: 'Usuário deve ter no mínimo 3 caracteres' }).max(50, { message: 'Usuário muito longo' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }).max(128, { message: 'Senha muito longa' }),
});

const registerSchema = z.object({
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }).max(128, { message: 'Senha muito longa' }),
  username: z.string().trim().min(3, { message: 'Usuário deve ter no mínimo 3 caracteres' }).max(50, { message: 'Usuário deve ter no máximo 50 caracteres' }),
  justification: z.string().trim().min(10, { message: 'Justificativa deve ter no mínimo 10 caracteres' }).max(2000, { message: 'Justificativa deve ter no máximo 2000 caracteres' }),
});

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Register state
  const [registerPassword, setRegisterPassword] = useState('');
  const [username, setUsername] = useState('');
  const [justification, setJustification] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = loginSchema.safeParse({
      username: loginUsername,
      password: loginPassword,
    });

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoginLoading(true);
    
    const { error, status } = await signIn(loginUsername, loginPassword);
    
    setLoginLoading(false);
    
    if (error) {
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Usuário ou senha incorretos');
      } else {
        toast.error(error.message || 'Erro ao fazer login');
      }
      return;
    }
    
    if (status === 'pending') {
      toast.warning('Seu acesso ainda está sendo analisado pelo Setor Admin.', {
        duration: 5000,
        icon: <AlertCircle className="w-5 h-5" />,
      });
      return;
    }
    
    toast.success('Login realizado com sucesso!');
    navigate('/');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = registerSchema.safeParse({
      password: registerPassword,
      username,
      justification,
    });

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setRegisterLoading(true);
    
    const { error } = await signUp(username, registerPassword, username, justification);
    
    setRegisterLoading(false);
    
    if (error) {
      if (error.message?.includes('already registered')) {
        toast.error('Este usuário já está cadastrado');
      } else {
        toast.error(error.message || 'Erro ao criar conta');
      }
      return;
    }
    
    toast.success('Cadastro realizado! Aguarde a aprovação do Setor Admin.', {
      duration: 5000,
    });
    
    // Clear form
    setRegisterPassword('');
    setUsername('');
    setJustification('');
  };

  return (
    <div className="min-h-screen bg-background tactical-bg flex items-center justify-center p-4">
      <div className="scanner-line" />
      
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Shield className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            DEC <span className="text-primary">PCESP</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de Gestão Policial
          </p>
        </div>

        {/* Auth Card */}
        <div className="tactical-card p-6">
          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="w-full bg-muted/50 border border-tactical-border">
              <TabsTrigger 
                value="login" 
                className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <UserPlus className="w-4 h-4" />
                Cadastrar
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>Usuário</Label>
                  <Input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Seu nome de usuário"
                    className="mt-1.5 bg-input border-tactical-border"
                    disabled={loginLoading}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive mt-1">{errors.username}</p>
                  )}
                </div>

                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1.5 bg-input border-tactical-border"
                    disabled={loginLoading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive mt-1">{errors.password}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full gap-2"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label>Usuário</Label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu nome de usuário"
                    className="mt-1.5 bg-input border-tactical-border"
                    disabled={registerLoading}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive mt-1">{errors.username}</p>
                  )}
                </div>

                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1.5 bg-input border-tactical-border"
                    disabled={registerLoading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive mt-1">{errors.password}</p>
                  )}
                </div>

                <div>
                  <Label>Descrição da Solicitação (Justificativa)</Label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Descreva o motivo da sua solicitação de acesso..."
                    className="mt-1.5 bg-input border-tactical-border min-h-[100px]"
                    disabled={registerLoading}
                  />
                  {errors.justification && (
                    <p className="text-sm text-destructive mt-1">{errors.justification}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full gap-2"
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Cadastrar
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4 font-mono">
          SISTEMA POLICIAL • GER PCESP • v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Auth;