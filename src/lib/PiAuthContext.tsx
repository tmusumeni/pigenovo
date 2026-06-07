import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { piService, PiUser, PiAuthResult } from './PiService';

interface PiAuthContextType {
  user: PiUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initializePi: () => Promise<void>;
  login: (scopes?: string[]) => Promise<PiAuthResult>;
  logout: () => void;
}

const PiAuthContext = createContext<PiAuthContextType | undefined>(undefined);

export interface PiAuthProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
}

export function PiAuthProvider({ children, autoInitialize = true }: PiAuthProviderProps) {
  const [user, setUser] = useState<PiUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(autoInitialize);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Auto-initialize Pi SDK on mount
  useEffect(() => {
    if (!autoInitialize) {
      setIsLoading(false);
      return;
    }

    const initPiOnMount = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await piService.init();
        setInitialized(true);
        // Auto-authenticate after successful init
        try {
          // Attempt to authenticate silently and validate token on backend
          const authResult = await piService.authenticate(['username']);
          if (authResult && authResult.success && authResult.accessToken) {
            const validationResult = await piService.validateTokenOnBackend(authResult.accessToken);
            if (validationResult && validationResult.success) {
              setUser(validationResult.user || authResult.user || null);
              setAccessToken(validationResult.accessToken || authResult.accessToken || null);
            } else {
              console.warn('Auto-login validation failed:', validationResult.error);
            }
          } else {
            console.warn('Auto-authenticate returned no user or token');
          }
        } catch (err) {
          console.warn('Auto-login error:', err);
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to initialize Pi SDK';
        console.error('Pi initialization error:', errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    initPiOnMount();
  }, [autoInitialize]);

  const initializePi = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await piService.init();
      setInitialized(true);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to initialize Pi SDK';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (scopes: string[] = ['username']): Promise<PiAuthResult> => {
    try {
      setIsLoading(true);
      setError(null);

      // Ensure Pi is initialized
      if (!initialized) {
        await initializePi();
      }

      // Authenticate with Pi
      const authResult = await piService.authenticate(scopes);

      if (!authResult.success) {
        const errorMsg = authResult.error || 'Authentication failed';
        setError(errorMsg);
        return authResult;
      }

      // Validate token on backend
      const validationResult = await piService.validateTokenOnBackend(authResult.accessToken!);

      if (!validationResult.success) {
        const errorMsg = validationResult.error || 'Token validation failed';
        setError(errorMsg);
        return validationResult;
      }

      // Update state with authenticated user and token
      setUser(validationResult.user || authResult.user || null);
      setAccessToken(validationResult.accessToken || authResult.accessToken || null);
      setError(null);

      return validationResult;
    } catch (err: any) {
      const errorMsg = err?.message || 'Login failed';
      setError(errorMsg);
      console.error('Login error:', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    piService.logout();
    setUser(null);
    setAccessToken(null);
    setError(null);
    console.log('User logged out');
  };

  const value: PiAuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    error,
    initializePi,
    login,
    logout
  };

  return (
    <PiAuthContext.Provider value={value}>
      {children}
    </PiAuthContext.Provider>
  );
}

/**
 * Hook to access Pi authentication context
 */
export function usePiAuth(): PiAuthContextType {
  const context = useContext(PiAuthContext);
  if (!context) {
    throw new Error('usePiAuth must be used within PiAuthProvider');
  }
  return context;
}
