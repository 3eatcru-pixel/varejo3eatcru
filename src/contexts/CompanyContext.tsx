import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CompanyBranding } from '../types/branding';
import { UserProfile } from '../types';
import { useWorkspace } from './WorkspaceContext';

interface CompanyContextType {
  branding: CompanyBranding | null;
  loadingBranding: boolean;
  saveBranding: (newBranding: Partial<CompanyBranding>) => Promise<void>;
  applyBrandColorsToDom: (branding: CompanyBranding | null) => void;
}

const defaultBranding: CompanyBranding = {
  companyId: 'default',
  name: 'VarejoPro ERP',
  tradeName: 'VarejoPro Loja',
  colors: {
    primary: '#10b981', // Emerald default
    secondary: '#0f172a',
    accent: '#34d399',
    background: '#f8fafc',
    sidebarBg: '#020617'
  },
  appearance: {
    sidebarStyle: 'default',
    density: 'comfortable',
    borderRadius: 'large',
    darkModeDefault: false
  },
  branding: {
    showPoweredBy: true,
    poweredByText: 'Tecnologia VarejoPro',
    whiteLabelTier: 'FREE'
  }
};

const CompanyContext = createContext<CompanyContextType>({
  branding: defaultBranding,
  loadingBranding: false,
  saveBranding: async () => {},
  applyBrandColorsToDom: () => {}
});

export function CompanyProvider({ 
  user, 
  children 
}: { 
  user: UserProfile | null; 
  children: React.ReactNode 
}) {
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [loadingBranding, setLoadingBranding] = useState(true);
  const { supportSession } = useWorkspace();

  const applyBrandColorsToDom = (brand: CompanyBranding | null) => {
    if (!brand) return;
    const root = document.documentElement;
    if (brand.colors?.primary) {
      root.style.setProperty('--brand-primary', brand.colors.primary);
    }
    if (brand.colors?.accent) {
      root.style.setProperty('--brand-accent', brand.colors.accent);
    }
    if (brand.colors?.secondary) {
      root.style.setProperty('--brand-secondary', brand.colors.secondary);
    }
    // Update Page Title and Favicon dynamically if provided
    if (brand.name) {
      document.title = `${brand.name} | Sistema de Gestão`;
    }
    if (brand.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = brand.faviconUrl;
    }
  };

  useEffect(() => {
    const effectiveCompanyId = supportSession ? supportSession.targetCompanyId : user?.companyId;
    
    if (!effectiveCompanyId) {
      setLoadingBranding(false);
      return;
    }

    setLoadingBranding(true);
    // Listen to company_branding collection in Firestore
    const brandingRef = doc(db, 'company_branding', effectiveCompanyId);
    const unsubscribe = onSnapshot(brandingRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CompanyBranding;
        setBranding(data);
        applyBrandColorsToDom(data);
      } else {
        // Fallback default based on user company
        const fallback: CompanyBranding = {
          ...defaultBranding,
          companyId: effectiveCompanyId || 'default',
          name: supportSession ? supportSession.targetCompanyName || effectiveCompanyId || 'default' : (user?.name ? `${user.name} Store` : 'VarejoPro Loja')
        };
        setBranding(fallback);
        applyBrandColorsToDom(fallback);
      }
      setLoadingBranding(false);
    }, (err) => {
      console.warn('Could not subscribe to company_branding:', err);
      setLoadingBranding(false);
    });

    return () => unsubscribe();
  }, [user?.companyId, supportSession?.targetCompanyId]);

  const saveBranding = async (newBranding: Partial<CompanyBranding>) => {
    const effectiveCompanyId = supportSession ? supportSession.targetCompanyId : user?.companyId;
    if (!effectiveCompanyId) throw new Error("ID da empresa ausente");
    const brandingRef = doc(db, 'company_branding', effectiveCompanyId);
    const merged: CompanyBranding = {
      ...(branding || defaultBranding),
      ...newBranding,
      companyId: effectiveCompanyId,
      updatedAt: new Date().toISOString()
    };

    await setDoc(brandingRef, merged, { merge: true });
    setBranding(merged);
    applyBrandColorsToDom(merged);
  };

  return (
    <CompanyContext.Provider value={{ branding, loadingBranding, saveBranding, applyBrandColorsToDom }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
