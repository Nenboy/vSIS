import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { logActivity } from '../lib/activityLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoggedLogin, setHasLoggedLogin] = useState(false);

  // ✅ fetchRole now handles turning off the loading state
  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setRole(data?.role || 'student');
    } catch (err) {
      console.error('Error fetching role:', err);
      setRole('student');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && !hasLoggedLogin) {
      logActivity('LOGIN', 'auth', session.user.id, { email: session.user.email });
      setHasLoggedLogin(true);
    }
    if (!session?.user) {
      setHasLoggedLogin(false);
    }
  }, [session, hasLoggedLogin]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setLoading(true);
          fetchRole(currentSession.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        setLoading(true);
        fetchRole(initialSession.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // ✅ UPDATED: Verify the email exists in the students table before allowing sign up
  const signUp = async (email: string, password: string) => {
    // STEP 1: Check if this email exists in the students table
    const { data: studentRecord, error: checkError } = await supabase
      .from('students')
      .select('id, email')
      .eq('email', email)
      .single();

    if (checkError || !studentRecord) {
      throw new Error(
        'Your email is not registered in the system. Please contact the Admin office to register your ID card first.'
      );
    }

    // STEP 2: Email is verified, create the Auth account
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { student_id: studentRecord.id },
      },
    });

    if (authError) throw authError;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (user) {
      await logActivity('LOGOUT', 'auth', user.id, { email: user.email });
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshUser = async () => {
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      setUser(currentUser);
      
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      setSession(currentSession);
      
      if (currentUser) {
        fetchRole(currentUser.id);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}