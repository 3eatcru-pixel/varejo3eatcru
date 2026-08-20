import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppFeatureFlags, DEFAULT_FEATURE_FLAGS, ResolvedFeatureFlags } from '../types/feature_flags';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface FeatureFlagContextType {
  flags: AppFeatureFlags;
  loading: boolean;
  refreshFlags: () => Promise<void>;
  hasFlag: (flagKey: keyof AppFeatureFlags) => boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser } = useAuth();
  const { activeWorkspace, supportSession } = useWorkspace();
  const [backendFlags, setBackendFlags] = useState<AppFeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [operationalFlags, setOperationalFlags] = useState<Partial<AppFeatureFlags>>({});
  const [loadingBackend, setLoadingBackend] = useState(true);
  const [loadingOperational, setLoadingOperational] = useState(true);

  const fetchFlags = async () => {
    if (!firebaseUser) {
      setBackendFlags(DEFAULT_FEATURE_FLAGS);
      setLoadingBackend(false);
      return;
    }

    try {
      setLoadingBackend(true);
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/feature-flags/resolve', {
        headers: {
          Authorization: `Bearer ${idToken}`,
          ...(supportSession ? { 'x-support-session-id': supportSession.id } : {}),
          'x-company-id': activeWorkspace?.id || ''
        }
      });

      if (res.ok) {
        const data: ResolvedFeatureFlags = await res.json();
        setBackendFlags(data.flags);
      }
    } catch (err) {
      console.warn('Error fetching feature flags:', err);
    } finally {
      setLoadingBackend(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [firebaseUser, activeWorkspace?.id, supportSession?.id]);

  // Real-time Operational Profile listener for Deterministic Feature Resolving
  useEffect(() => {
    const companyId = activeWorkspace?.id;
    if (!companyId) {
      setOperationalFlags({});
      setLoadingOperational(false);
      return;
    }

    setLoadingOperational(true);
    const docRef = doc(db, 'settings', `operational_${companyId}`);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const segments = data.segments || [];
        const operations = data.operations || [];
        const features = data.features || [];

        // Deterministic Feature Resolving
        const resolved: Partial<AppFeatureFlags> = {
          pulseEnabled: features.includes('PULSE'),
          kdsEnabled: features.includes('KDS'),
          tableService: operations.includes('MESA') || segments.includes('RESTAURANTE') || segments.includes('BAR'),
          comandaEnabled: operations.includes('COMANDA'),
          servicesEnabled: segments.includes('SERVICOS') || segments.includes('OFICINA') || operations.includes('AGENDAMENTO'),
          deliveryEnabled: operations.includes('DELIVERY')
        };
        setOperationalFlags(resolved);
      } else {
        // Fallback default operational flags if not configured (enable all by default for compatibility)
        setOperationalFlags({
          pulseEnabled: true,
          kdsEnabled: true,
          tableService: true,
          comandaEnabled: true,
          servicesEnabled: true,
          deliveryEnabled: true
        });
      }
      setLoadingOperational(false);
    }, (err) => {
      console.warn('Error listening to operational settings, using fallback:', err);
      setOperationalFlags({
        pulseEnabled: true,
        kdsEnabled: true,
        tableService: true,
        comandaEnabled: true,
        servicesEnabled: true,
        deliveryEnabled: true
      });
      setLoadingOperational(false);
    });

    return () => unsubscribe();
  }, [activeWorkspace?.id]);

  // Merge SaaS Backend Flags with Deterministic Operational Flags
  const mergedFlags: AppFeatureFlags = {
    ...backendFlags,
    pulseEnabled: !!operationalFlags.pulseEnabled,
    kdsEnabled: !!operationalFlags.kdsEnabled,
    tableService: !!operationalFlags.tableService,
    comandaEnabled: !!operationalFlags.comandaEnabled,
    servicesEnabled: !!operationalFlags.servicesEnabled,
    deliveryEnabled: !!operationalFlags.deliveryEnabled,
  };

  const hasFlag = (flagKey: keyof AppFeatureFlags) => {
    return !!mergedFlags[flagKey];
  };

  const loading = loadingBackend || loadingOperational;

  return (
    <FeatureFlagContext.Provider value={{ flags: mergedFlags, loading, refreshFlags: fetchFlags, hasFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags deve ser utilizado dentro de um FeatureFlagProvider');
  }
  return context;
}
