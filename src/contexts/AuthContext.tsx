import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { SectorValue } from '@/types/police';

type UserStatus = 'pending' | 'approved' | 'rejected' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userStatus: UserStatus;
  isLoading: boolean;
  isAdmin: boolean;
  isAnyAdmin: boolean;
  adminSector: SectorValue | null;
  currentSector: SectorValue | null;
  signUp: (usernameAsEmail: string, password: string, username: string, justification: string, sector: SectorValue) => Promise<{ error: any }>;
  signIn: (username: string, password: string) => Promise<{ error: any; status?: UserStatus }>;
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
  const [isAnyAdmin, setIsAnyAdmin] = useState(false);
  const [adminSector, setAdminSector] = useState<SectorValue | null>(null);
  const [currentSector, setCurrentSector] = useState<SectorValue | null>(null);

  const fetchUserStatus = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status, sector')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching user status:', error);
        return null;
      }

      setCurrentSector(((profile as any)?.sector ?? null) as SectorValue | null);
      return profile?.status as UserStatus;
    } catch (error) {
      logger.error('Error in fetchUserStatus:', error);
      return null;
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, sector')
        .eq('user_id', userId);

      if (error) {
        logger.error('Error fetching admin status:', error);
        return { isAdmin: false, isAnyAdmin: false, adminSector: null as SectorValue | null };
      }
      const rows = (data || []) as { role: string; sector: SectorValue | null }[];
      const isAdmin = rows.some(r => r.role === 'admin');
      const sectorAdminRow = rows.find(r => r.role === 'sector_admin');
      return {
        isAdmin,
        isAnyAdmin: isAdmin || !!sectorAdminRow,
        adminSector: sectorAdminRow?.sector ?? null,
      };
    } catch (error) {
      logger.error('Error in fetchRoles:', error);
      return { isAdmin: false, isAnyAdmin: false, adminSector: null as SectorValue | null };
    }
  };

  const refreshUserStatus = async () => {
    if (user) {
      const status = await fetchUserStatus(user.id);
      setUserStatus(status);
      const r = await fetchRoles(user.id);
      setIsAdmin(r.isAdmin);
      setIsAnyAdmin(r.isAnyAdmin);
      setAdminSector(r.adminSector);
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
            fetchRoles(session.user.id).then(r => {
              setIsAdmin(r.isAdmin);
              setIsAnyAdmin(r.isAnyAdmin);
              setAdminSector(r.adminSector);
            });
          }, 0);
        } else {
          setUserStatus(null);
          setIsAdmin(false);
          setIsAnyAdmin(false);
          setAdminSector(null);
          setCurrentSector(null);
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
          fetchRoles(session.user.id)
        ]).then(([status, r]) => {
          setUserStatus(status);
          setIsAdmin(r.isAdmin);
          setIsAnyAdmin(r.isAnyAdmin);
          setAdminSector(r.adminSector);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    usernameAsEmail: string,
    password: string,
    username: string,
    justification: string,
    sector: SectorValue
  ) => {
    // Use username as a fake email for Supabase auth
    const fakeEmail = `${usernameAsEmail.toLowerCase().replace(/[^a-z0-9]/g, '')}@dec.pcesp.local`;
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
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
          proof_url: null,
          status: 'pending',
          sector,
        });

      if (profileError) {
        logger.error('Error creating profile:', profileError);
        return { error: profileError };
      }

      // Sign out the user - they need to wait for approval
      await supabase.auth.signOut();
    }

    return { error: null };
  };

  const signIn = async (username: string, password: string) => {
    // Use username as a fake email for Supabase auth
    const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@dec.pcesp.local`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
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

      const r = await fetchRoles(data.user.id);
      setIsAdmin(r.isAdmin);
      setIsAnyAdmin(r.isAnyAdmin);
      setAdminSector(r.adminSector);
    }

    return { error: null, status: 'approved' as UserStatus };
  };

  const signOut = async () => {
    // Clear sensitive localStorage data on logout
    const localStorageKeys = [
      'pm19_policiais',
      'pm19_patrulhas', 
      'pm19_apreensoes',
      'pm19_logs',
      'pm19_pdf_generated'
    ];
    localStorageKeys.forEach(key => localStorage.removeItem(key));
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserStatus(null);
    setIsAdmin(false);
    setIsAnyAdmin(false);
    setAdminSector(null);
    setCurrentSector(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userStatus,
      isLoading,
      isAdmin,
      isAnyAdmin,
      adminSector,
      currentSector,
      signUp,
      signIn,
      signOut,
      refreshUserStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};