export interface AppFeatureFlags {
  newCheckout: boolean;
  offlineEngine: boolean;
  fiscalModule: boolean;
  aiAssistant: boolean;
  multiBranch: boolean;
  customBranding: boolean;
  [key: string]: boolean;
}

export const DEFAULT_FEATURE_FLAGS: AppFeatureFlags = {
  newCheckout: true,
  offlineEngine: true,
  fiscalModule: true,
  aiAssistant: false,
  multiBranch: true,
  customBranding: true
};

export interface ResolvedFeatureFlags {
  flags: AppFeatureFlags;
  sources: Record<string, 'GLOBAL' | 'PLAN' | 'COMPANY' | 'DEFAULT'>;
  companyId: string;
  planTier: string;
}
