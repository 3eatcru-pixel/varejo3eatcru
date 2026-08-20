import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanyWorkspace, CompanyRole } from '../types/identity';
import { useAuth } from './AuthContext';

export interface SupportSessionData {
  id: string;
  targetCompanyId: string;
  targetCompanyName?: string;
  reason: string;
  expiresAt: string;
}

interface WorkspaceContextType {
  workspaces: CompanyWorkspace[];
  activeWorkspace: CompanyWorkspace | null;
  activeBranchId: string;
  activeTerminalId: string;
  loadingWorkspaces: boolean;
  supportSession: SupportSessionData | null;
  switchWorkspace: (companyId: string, branchId?: string, terminalId?: string) => Promise<void>;
  createWorkspace: (data: { name: string; tradeName?: string; cnpj?: string; phone?: string; email?: string }) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  setBranchAndTerminal: (branchId: string, terminalId: string) => void;
  startSupportSession: (targetCompanyId: string, reason: string, durationMinutes?: number) => Promise<void>;
  endSupportSession: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const [workspaces, setWorkspaces] = useState<CompanyWorkspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<CompanyWorkspace | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string>('MATRIZ');
  const [activeTerminalId, setActiveTerminalId] = useState<string>('PDV-01');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [supportSession, setSupportSession] = useState<SupportSessionData | null>(() => {
    try {
      const stored = localStorage.getItem('varejopro_support_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          return parsed;
        }
        localStorage.removeItem('varejopro_support_session');
      }
    } catch {
      // ignore
    }
    return null;
  });

  const fetchWorkspaces = async () => {
    if (!firebaseUser) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      return;
    }

    setLoadingWorkspaces(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/account/workspaces', {
        headers: { 
          Authorization: `Bearer ${idToken}`,
          ...(supportSession ? { 'x-support-session-id': supportSession.id } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        const list: CompanyWorkspace[] = data.workspaces || [];
        setWorkspaces(list);

        // Determine active workspace
        if (supportSession) {
          const supportWs: CompanyWorkspace = {
            id: supportSession.targetCompanyId,
            name: supportSession.targetCompanyName || `Suporte: ${supportSession.targetCompanyId}`,
            tradeName: supportSession.targetCompanyName || supportSession.targetCompanyId,
            planTier: 'ENTERPRISE', // Support assumes max tier
            status: 'ACTIVE',
            roleInCompany: CompanyRole.OWNER
          };
          setActiveWorkspace(supportWs);
        } else {
          const currentCompanyId = userProfile?.companyId;
          const current = list.find(w => w.id === currentCompanyId) || list[0] || null;
          setActiveWorkspace(current);
        }

        if (userProfile?.branchId) setActiveBranchId(userProfile.branchId);
        if (userProfile?.terminalId) setActiveTerminalId(userProfile.terminalId);
      }
    } catch (err) {
      console.warn('Error fetching workspaces:', err);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [firebaseUser, userProfile?.companyId, supportSession?.id]);

  const switchWorkspace = async (companyId: string, branchId?: string, terminalId?: string) => {
    if (!firebaseUser) return;
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch('/api/account/workspaces/switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...(supportSession ? { 'x-support-session-id': supportSession.id } : {})
      },
      body: JSON.stringify({ companyId, branchId, terminalId })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao trocar de empresa.');
    }

    const current = workspaces.find(w => w.id === companyId) || null;
    setActiveWorkspace(current);
    if (branchId) setActiveBranchId(branchId);
    if (terminalId) setActiveTerminalId(terminalId);

    // Refresh profile in AuthContext
    await refreshProfile();
  };

  const createWorkspace = async (data: { name: string; tradeName?: string; cnpj?: string; phone?: string; email?: string }) => {
    if (!firebaseUser) return;
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch('/api/account/workspaces/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao criar empresa.');
    }

    await fetchWorkspaces();
    await refreshProfile();
  };

  const startSupportSession = async (targetCompanyId: string, reason: string, durationMinutes = 30) => {
    if (!firebaseUser) return;
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch('/api/hq/support-session/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ targetCompanyId, reason, durationMinutes })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao iniciar sessão de suporte.');
    }

    const data = await res.json();
    const sessionObj: SupportSessionData = {
      id: data.session.id,
      targetCompanyId,
      targetCompanyName: data.session.targetCompanyId,
      reason,
      expiresAt: data.session.expiresAt
    };

    localStorage.setItem('varejopro_support_session', JSON.stringify(sessionObj));
    setSupportSession(sessionObj);
    await refreshProfile();
  };

  const endSupportSession = async () => {
    localStorage.removeItem('varejopro_support_session');
    setSupportSession(null);
    await fetchWorkspaces();
    await refreshProfile();
  };

  const setBranchAndTerminal = (branchId: string, terminalId: string) => {
    setActiveBranchId(branchId);
    setActiveTerminalId(terminalId);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeBranchId,
        activeTerminalId,
        loadingWorkspaces,
        supportSession,
        switchWorkspace,
        createWorkspace,
        refreshWorkspaces: fetchWorkspaces,
        setBranchAndTerminal,
        startSupportSession,
        endSupportSession
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace deve ser utilizado dentro de um WorkspaceProvider.');
  }
  return context;
}
