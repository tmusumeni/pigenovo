import React, { useState } from 'react';
import { usePiAuth } from '@/lib/PiAuthContext';
import { Loader2, LogOut } from 'lucide-react';

export function PiAuthButton() {
  const { user, isAuthenticated, isLoading, login, logout } = usePiAuth();
  const [isAttempting, setIsAttempting] = useState(false);

  const handleLogin = async () => {
    if (isAttempting) return;
    
    setIsAttempting(true);
    try {
      const result = await login(['username']);
      if (result.success && result.user) {
        console.log(`Logged in as ${result.user.username}`);
      }
    } finally {
      setIsAttempting(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-foreground">
            {user.username}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          title="Logout from Pi Network"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading || isAttempting}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading || isAttempting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Signing in...</span>
        </>
      ) : (
        <>
          <span>Sign in with Pi</span>
        </>
      )}
    </button>
  );
}
