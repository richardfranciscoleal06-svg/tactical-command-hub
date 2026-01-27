import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, LogIn, UserPlus, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255, { message: 'Email muito longo' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }).max(128, { message: 'Senha muito longa' }),
});

const registerSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255, { message: 'Email muito longo' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }).max(128, { message: 'Senha muito longa' }),
  username: z.string().trim().min(3, { message: 'Usuário deve ter no mínimo 3 caracteres' }).max(50, { message: 'Usuário deve ter no máximo 50 caracteres' }),
  justification: z.string().trim().min(10, { message: 'Justificativa deve ter no mínimo 10 caracteres' }).max(2000, { message: 'Justificativa deve ter no máximo 2000 caracteres' }),
});

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Register state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [username, setUsername] = useState('');
  const [justification, setJustification] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = loginSchema.safeParse({
      email: loginEmail,
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
    
    const { error, status } = await signIn(loginEmail, loginPassword);
    
    setLoginLoading(false);
    
    if (error) {
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
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
      email: registerEmail,
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

    if (!proofFile) {
      setErrors({ proofFile: 'Arquivo de comprovação é obrigatório' });
      return;
    }

    // Validate file size and type
    if (proofFile.size > MAX_FILE_SIZE) {
      setErrors({ proofFile: 'Arquivo muito grande. Máximo 10MB.' });
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(proofFile.type)) {
      setErrors({ proofFile: 'Tipo de arquivo não permitido. Use imagens (JPG, PNG, GIF) ou PDF.' });
      return;
    }

    setRegisterLoading(true);
    
    try {
      // STEP 1: Sign up user FIRST (before file upload)
      // This creates the user and authenticates them
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(signUpError.message || 'Erro ao criar conta');
        }
        setRegisterLoading(false);
        return;
      }

      if (!signUpData.user) {
        toast.error('Erro ao criar conta');
        setRegisterLoading(false);
        return;
      }

      const userId = signUpData.user.id;

      // STEP 2: Upload proof file with correct path structure (user_id/filename)
      // Now the user is authenticated and can upload to their folder
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(fileName, proofFile);

      if (uploadError) {
        logger.error('Upload error:', uploadError);
        toast.error('Erro ao enviar arquivo de comprovação');
        setRegisterLoading(false);
        return;
      }

      // STEP 3: Create profile with pending status
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username,
          justification,
          proof_url: fileName, // Store the path, not public URL
          status: 'pending'
        });

      if (profileError) {
        logger.error('Profile error:', profileError);
        // Cleanup: delete uploaded file if profile creation fails
        await supabase.storage.from('proofs').remove([fileName]);
        toast.error('Erro ao criar perfil');
        setRegisterLoading(false);
        return;
      }

      // Sign out the user - they need to wait for approval
      await supabase.auth.signOut();

      toast.success('Cadastro realizado! Aguarde a aprovação do Setor Admin.', {
        duration: 5000,
      });
      
      // Clear form
      setRegisterEmail('');
      setRegisterPassword('');
      setUsername('');
      setJustification('');
      setProofFile(null);
      
    } catch (err) {
      logger.error('Registration error:', err);
      toast.error('Erro ao criar conta');
    } finally {
      setRegisterLoading(false);
    }
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
            DAP <span className="text-primary">PCESP</span>
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
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-1.5 bg-input border-tactical-border"
                    disabled={loginLoading}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email}</p>
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
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-1.5 bg-input border-tactical-border"
                    disabled={registerLoading}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email}</p>
                  )}
                </div>

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

                <div>
                  <Label>Arquivo de Comprovação</Label>
                  <div className="mt-1.5">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-tactical-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-input">
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {proofFile ? proofFile.name : 'Clique para enviar'}
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        disabled={registerLoading}
                      />
                    </label>
                  </div>
                  {errors.proofFile && (
                    <p className="text-sm text-destructive mt-1">{errors.proofFile}</p>
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
          SISTEMA POLICIAL • DAP PCESP • v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Auth;
