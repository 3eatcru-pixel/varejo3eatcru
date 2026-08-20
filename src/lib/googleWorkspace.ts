import { GoogleWorkspaceService } from '../services/workspace/GoogleWorkspaceService';
import { TokenManager } from '../services/workspace/TokenManager';

export const connectGoogleDrive = async () => {
  const session = await GoogleWorkspaceService.connect();
  return {
    user: { email: session.email, displayName: session.name } as any,
    accessToken: session.accessToken
  };
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return TokenManager.getValidAccessToken();
};

export const getGoogleAccessTokenSync = (): string | null => {
  return TokenManager.getValidAccessTokenSync();
};

export const clearGoogleAccessToken = () => {
  TokenManager.clearSession();
};
