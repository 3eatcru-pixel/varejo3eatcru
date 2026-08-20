import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, CompanyRole } from '../types';
import { UserAccount, UserProfileDetails, UserSession, PlatformRole } from '../types/identity';

export interface AuthContextType {
  // Core Identity
  userProfile: UserProfile | null;
  account: UserAccount | null;
  profile: UserProfileDetails | null;
  sessions: UserSession[];
  
  // Platform Admin
  isPlatformAdmin: boolean;
  platformRole: PlatformRole | null;
  
  loadingAuth: boolean;
  
  // Base Actions
  loginWithEmail: (email: string, pass: string, companyId?: string) => Promise<{ requireWorkspaceSelection?: boolean; workspaces?: any[] } | void>;
  hqLogin: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string, companyName: string) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace?: (companyId: string) => Promise<void>;
  
  // Account Actions
  refreshProfile: () => Promise<UserProfile | null>;
  updateProfileDetails: (data: Partial<UserProfileDetails>) => Promise<void>;
  revokeSession: (sessionId?: string, revokeAllOthers?: boolean) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  changePassword?: (newPassword: string, currentPassword?: string) => Promise<void>;
  sendVerificationEmail?: () => Promise<void>;

  // Legacy shim
  firebaseUser?: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<UserProfileDetails | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformRole, setPlatformRole] = useState<PlatformRole | null>(null);

  const [loadingAuth, setLoadingAuth] = useState(true);

  const fetchAccountData = async (token: string) => {
    try {
      const [accRes, sessRes] = await Promise.all([
        fetch('/api/account/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/account/sessions', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccount(accData.account || null);
        setProfile(accData.profile || null);
        setIsPlatformAdmin(Boolean(accData.isPlatformAdmin));
        setPlatformRole(accData.platformRole || null);
      }
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData.sessions || []);
      }
    } catch (err) {
      console.warn('Error fetching account details:', err);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('varejopro_auth_token');
      const savedProfile = localStorage.getItem('varejopro_profile');
      
      if (token && savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setUserProfile(parsed.user || parsed);
          await fetchAccountData(token);
        } catch {}
      }
      setLoadingAuth(false);
    };
    checkToken();
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    const token = localStorage.getItem('varejopro_auth_token');
    if (token) {
       await fetchAccountData(token);
    }
    return userProfile;
  };

  const loginWithEmail = async (email: string, pass: string, companyId?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, companyId })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao fazer login');
    }
    
    const data = await res.json();
    if (data.requireWorkspaceSelection) {
      return {
        requireWorkspaceSelection: true,
        workspaces: data.workspaces
      };
    }
    
    localStorage.setItem('varejopro_auth_token', data.token);
    localStorage.setItem('varejopro_profile', JSON.stringify(data.user));
    setUserProfile(data.user);
    await fetchAccountData(data.token);
  };

  const switchWorkspace = async (companyId: string) => {
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/auth/switch-workspace', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ companyId })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao alternar de workspace');
      }
      const data = await res.json();
      localStorage.setItem('varejopro_auth_token', data.token);
      localStorage.setItem('varejopro_profile', JSON.stringify(data.user));
      setUserProfile(data.user);
      await fetchAccountData(data.token);
    } catch (error: any) {
      console.error('Switch workspace failed:', error.message);
      throw error;
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string, companyName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass, companyName })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao registrar conta');
    }
    
    const data = await res.json();
    localStorage.setItem('varejopro_auth_token', data.token);
    localStorage.setItem('varejopro_profile', JSON.stringify(data.user));
    setUserProfile(data.user);
    await fetchAccountData(data.token);
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return {
        success: res.ok,
        message: data.message || "Se houver uma conta associada a este e-mail, enviaremos as instruções de recuperação."
      };
    } catch (e: any) {
      return { success: false, message: e.message || "Erro de conexão." };
    }
  };

  const changePassword = async (newPass: string, currentPass?: string) => {
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newPassword: newPass, currentPassword: currentPass })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao alterar a senha.");
      }
    } catch (e: any) {
      console.error('Falha na alteração de senha:', e.message);
      throw e;
    }
  };

  const sendVerificationEmail = async () => {
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao solicitar verificação.');
      }
    } catch (e: any) {
      console.error('Falha ao enviar e-mail de verificação:', e.message);
      throw e;
    }
  };
  
  const hqLogin = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/hq/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro no login HQ');
      
      localStorage.setItem('varejopro_auth_token', data.token);
      localStorage.setItem('varejopro_profile', JSON.stringify(data.user));
      
      setUserProfile(data.user);
      await fetchAccountData(data.token);
    } catch (error: any) {
      console.error('HQ AuthContext login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('varejopro_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        // non-blocking
      }
    }

    localStorage.removeItem('varejopro_auth_token');
    localStorage.removeItem('varejopro_profile');
    localStorage.removeItem('varejopro_support_session');
    
    setUserProfile(null);
    setAccount(null);
    setProfile(null);
    setSessions([]);
    setIsPlatformAdmin(false);
    setPlatformRole(null);
  };

  const updateProfileDetails = async (data: Partial<UserProfileDetails>) => {
    const token = localStorage.getItem('varejopro_auth_token');
    if (!token) return;
    
    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao atualizar perfil.');
    }
    
    const resData = await res.json();
    setProfile(resData.profile);
    
    if (account) {
      setAccount({
        ...account,
        displayName: data.preferredName || data.fullName || account.displayName,
        avatarUrl: data.avatarUrl || account.avatarUrl
      });
    }
    
    if (userProfile) {
       setUserProfile({
         ...userProfile,
         name: data.fullName || userProfile.name,
         avatarUrl: data.avatarUrl || userProfile.avatarUrl
       });
       localStorage.setItem('varejopro_profile', JSON.stringify({
         ...userProfile,
         name: data.fullName || userProfile.name,
         avatarUrl: data.avatarUrl || userProfile.avatarUrl
       }));
    }
  };

  const revokeSession = async (sessionId?: string, revokeAllOthers?: boolean) => {
    const token = localStorage.getItem('varejopro_auth_token');
    if (!token) return;
    
    const res = await fetch('/api/account/sessions/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId, revokeAllOthers })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao encerrar sessão.');
    }
    
    const sessRes = await fetch('/api/account/sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (sessRes.ok) {
      const sessData = await sessRes.json();
      setSessions(sessData.sessions || []);
    }
  };

  const getToken = async (): Promise<string | null> => {
    return localStorage.getItem('varejopro_auth_token');
  };

  return (
    <AuthContext.Provider
      value={{
        userProfile,
        account,
        profile,
        sessions,
        isPlatformAdmin,
        platformRole,
        
        firebaseUser: userProfile ? { 
           uid: userProfile.uid, 
           email: userProfile.email, 
           displayName: userProfile.name,
           getIdToken: getToken
        } : null,
        loadingAuth,
        
        loginWithEmail,
        hqLogin,
        registerWithEmail,
        logout,
        refreshProfile,
        sendPasswordReset,
        changePassword,
        sendVerificationEmail,
        switchWorkspace,
        
        updateProfileDetails,
        revokeSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }
  return context;
}
