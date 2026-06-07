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

async function parseJsonSafe(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { rawBody: text };
  }
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
      // Load the Pi SDK script dynamically if not present
      if (!window.Pi) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector('script[data-pi-sdk]');
          if (existing) {
            // wait for it to attach window.Pi
            const check = () => {
              if (window.Pi) return resolve();
              setTimeout(check, 50);
            };
            check();
            return;
          }

          const s = document.createElement('script');
          s.setAttribute('data-pi-sdk', '1');
          s.src = 'https://sdk.minepi.com/pi-sdk.js';
          s.async = true;
          s.onload = () => resolve();
          s.onerror = (e) => reject(new Error('Failed to load Pi SDK'));
          document.head.appendChild(s);
        });
      }

      // Initialize Pi SDK (Pi.init returns a promise-like object)
      if (!window.Pi) {
        throw new Error('Pi SDK not available after load');
      }

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

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Token validation failed',
          message: data.rawBody ? `Unexpected response: ${data.rawBody}` : undefined
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
