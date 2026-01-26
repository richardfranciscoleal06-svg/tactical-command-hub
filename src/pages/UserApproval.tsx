import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Lock, 
  Unlock, 
  Check, 
  X, 
  Users,
  FileText,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface PendingUser {
  id: string;
  user_id: string;
  username: string;
  justification: string;
  proof_url: string | null;
  created_at: string;
}

const SENHA_SETOR_ADMIN = '281106';

export const UserApproval = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [senha, setSenha] = useState('');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [processing, setProcessing] = useState(false);

  const loadPendingUsers = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading pending users:', error);
      toast.error('Erro ao carregar usuários pendentes');
    } else {
      setPendingUsers(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (!isLocked) {
      loadPendingUsers();
    }
  }, [isLocked]);

  const handleUnlock = () => {
    if (senha === SENHA_SETOR_ADMIN) {
      setIsLocked(false);
      setSenha('');
      toast.success('Acesso liberado');
    } else {
      toast.error('Senha incorreta');
      setSenha('');
    }
  };

  const openModal = (user: PendingUser, actionType: 'approve' | 'reject') => {
    setSelectedUser(user);
    setAction(actionType);
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!selectedUser) return;
    
    setProcessing(true);
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', selectedUser.id);

    if (error) {
      console.error('Error updating user status:', error);
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(action === 'approve' ? 'Usuário aprovado!' : 'Usuário rejeitado');
      loadPendingUsers();
    }
    
    setProcessing(false);
    setShowModal(false);
    setSelectedUser(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (isLocked) {
    return (
      <div className="tactical-card p-8 w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="p-4 rounded-full bg-primary/10 inline-block mb-4">
            <Lock className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Aprovação de Usuários</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Área restrita. Digite a senha do setor admin para acessar.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Senha do Setor Admin</Label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••"
              className="mt-1.5 bg-input border-tactical-border text-center font-mono text-lg tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
          </div>
          <Button onClick={handleUnlock} className="w-full gap-2">
            <Unlock className="w-4 h-4" />
            Desbloquear
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Aprovação de Usuários</h2>
            <p className="text-sm text-muted-foreground">
              {pendingUsers.length} usuário(s) aguardando aprovação
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsLocked(true)}
          className="gap-2"
        >
          <Lock className="w-4 h-4" />
          Bloquear
        </Button>
      </div>

      {loading ? (
        <div className="tactical-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Carregando...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="tactical-card p-8 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum usuário pendente de aprovação</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map(user => (
            <div key={user.id} className="tactical-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-lg">{user.username}</p>
                  
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-tactical-border">
                    <p className="text-sm font-medium text-primary mb-1">Justificativa:</p>
                    <p className="text-sm text-muted-foreground">{user.justification}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3">
                    {user.proof_url && (
                      <a 
                        href={user.proof_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Comprovação
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Cadastrado em: {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => openModal(user, 'approve')}
                    className="gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openModal(user, 'reject')}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" />
                    Reprovar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-tactical-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === 'approve' ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <X className="w-5 h-5 text-destructive" />
              )}
              {action === 'approve' ? 'Aprovar' : 'Reprovar'} Usuário
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja {action === 'approve' ? 'aprovar' : 'reprovar'} o usuário <strong>{selectedUser?.username}</strong>?
            </p>
            {action === 'approve' && (
              <p className="text-sm text-success mt-2">
                O usuário poderá acessar o sistema após a aprovação.
              </p>
            )}
            {action === 'reject' && (
              <p className="text-sm text-destructive mt-2">
                O usuário não poderá acessar o sistema.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAction}
              variant={action === 'approve' ? 'default' : 'destructive'}
              disabled={processing}
              className="gap-2"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : action === 'approve' ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserApproval;
