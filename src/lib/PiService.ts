/**
 * PiService handles all communication with the Pi Network.
 * Provides authentication and user management via Pi SDK.
 */

declare global {
  interface Window {
    Pi: any;
  }
}

export interface PiUser {
  uid: string;
  username: string;
}

export interface PiAuthResult {
  success: boolean;
  user?: PiUser;
  accessToken?: string;
  error?: string;
  message?: string;
}

export class PiService {
  private initialized = false;
  private user: PiUser | null = null;
  private accessToken: string | null = null;

  /**
   * Initialize the Pi SDK.
   * Must be called before calling authenticate().
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure window.Pi is available
      if (!window.Pi) {
        throw new Error('Pi SDK not loaded. Ensure pi-sdk.js is included in HTML head.');
      }

      // Initialize Pi SDK
      await window.Pi.init({
        version: '2.0',
        scopes: ['username'],
      });

      this.initialized = true;
      console.log('Pi SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Pi SDK:', error);
      throw error;
    }
  }

  /**
   * Authenticate the user with Pi Network.
   * Must call init() first before calling this method.
   * @param scopes - Array of requested scopes (default: ['username'])
   */
  async authenticate(scopes: string[] = ['username']): Promise<PiAuthResult> {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!window.Pi) {
        return {
          success: false,
          error: 'Pi SDK not available'
        };
      }

      // Call Pi.authenticate with scopes
      const auth = await window.Pi.authenticate(scopes, this.onIncompletePaymentFound.bind(this));

      if (!auth || !auth.user) {
        return {
          success: false,
          error: 'Authentication failed: no user data returned'
        };
      }

      this.user = auth.user;
      this.accessToken = auth.accessToken;

      console.log(`Authenticated as ${this.user.username} (${this.user.uid})`);

      return {
        success: true,
        user: this.user,
        accessToken: this.accessToken
      };
    } catch (error: any) {
      console.error('Authentication Error:', error);
      return {
        success: false,
        error: error?.message || 'Authentication failed',
        message: error?.message
      };
    }
  }

  /**
   * Validate the access token on the backend.
   * The backend will verify the token with Pi API.
   * @param accessToken - The access token from Pi authentication
   */
  async validateTokenOnBackend(accessToken: string): Promise<PiAuthResult> {
    try {
      const response = await fetch('/api/pi-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Token validation failed'
        };
      }

      return {
        success: true,
        user: data.user,
        accessToken: data.accessToken
      };
    } catch (error: any) {
      console.error('Token validation error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to validate token'
      };
    }
  }

  /**
   * Required callback for Pi SDK.
   * Handles payments that were interrupted before completion.
   */
  private onIncompletePaymentFound(payment: any): void {
    console.warn('Incomplete payment found:', payment.identifier);
    // Logic to resolve this on the backend should be added here.
  }

  /**
   * Get current user information
   */
  getUser(): PiUser | null {
    return this.user;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.user && !!this.accessToken;
  }

  /**
   * Clear authentication data
   */
  logout(): void {
    this.user = null;
    this.accessToken = null;
    console.log('User logged out from Pi Network');
  }
}

export const piService = new PiService();
