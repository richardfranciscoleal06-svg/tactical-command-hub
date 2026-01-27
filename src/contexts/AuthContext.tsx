import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

type UserStatus = 'pending' | 'approved' | 'rejected' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userStatus: UserStatus;
  isLoading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, username: string, justification: string, proofUrl: string | null) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; status?: UserStatus }>;
  signOut: () => Promise<void>;
  refreshUserStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserStatus = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching user status:', error);
        return null;
      }

      return profile?.status as UserStatus;
    } catch (error) {
      logger.error('Error in fetchUserStatus:', error);
      return null;
    }
  };

  const fetchIsAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        logger.error('Error fetching admin status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      logger.error('Error in fetchIsAdmin:', error);
      return false;
    }
  };

  const refreshUserStatus = async () => {
    if (user) {
      const status = await fetchUserStatus(user.id);
      setUserStatus(status);
      const adminStatus = await fetchIsAdmin(user.id);
      setIsAdmin(adminStatus);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer fetching profile data
        if (session?.user) {
          setTimeout(() => {
            fetchUserStatus(session.user.id).then(setUserStatus);
            fetchIsAdmin(session.user.id).then(setIsAdmin);
          }, 0);
        } else {
          setUserStatus(null);
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          fetchUserStatus(session.user.id),
          fetchIsAdmin(session.user.id)
        ]).then(([status, admin]) => {
          setUserStatus(status);
          setIsAdmin(admin);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    username: string,
    justification: string,
    proofUrl: string | null
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      // Create profile with pending status
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          username,
          justification,
          proof_url: proofUrl,
          status: 'pending'
        });

      if (profileError) {
        logger.error('Error creating profile:', profileError);
        return { error: profileError };
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      const status = await fetchUserStatus(data.user.id);
      setUserStatus(status);

      if (status === 'pending') {
        // Sign out if pending
        await supabase.auth.signOut();
        return { error: null, status: 'pending' as UserStatus };
      }

      if (status === 'rejected') {
        await supabase.auth.signOut();
        return { error: { message: 'Seu acesso foi negado pelo Setor Admin.' }, status: 'rejected' as UserStatus };
      }

      const adminStatus = await fetchIsAdmin(data.user.id);
      setIsAdmin(adminStatus);
    }

    return { error: null, status: 'approved' as UserStatus };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserStatus(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userStatus,
      isLoading,
      isAdmin,
      signUp,
      signIn,
      signOut,
      refreshUserStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};
