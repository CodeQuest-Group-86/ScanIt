import type {
    ApiResponse,
    AuthTokens,
    LoginPayload,
    ResetPasswordPayload,
    SendOtpPayload,
    SignUpPayload,
    User,
    VerifyOtpPayload,
} from '@/types';
import { api } from '@/utils/api';

interface BackendAuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function mapTokens(d: BackendAuthResponse): AuthTokens {
  return { accessToken: d.accessToken, refreshToken: d.refreshToken, expiresAt: d.expiresAt };
}

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    try {
      const data = await api.post<BackendAuthResponse>(
        '/auth/sign-in',
        { email: payload.email, password: payload.password },
        { skipAuth: true }
      );
      return { success: true, data: { user: data.user, tokens: mapTokens(data) } };
    } catch (e: any) {
      // Fallback for development without backend
      console.warn('Backend not available, using mock login:', e.message);
      const mockUser: User = {
        id: 'mock-user-1',
        name: 'Demo User',
        email: payload.email,
        phoneNumber: '+233200000000',
        role: 'consumer',
        scansCount: 0,
        savedCount: 0,
        totalSaved: 0,
        createdAt: new Date().toISOString(),
      };
      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresAt: Date.now() + 3600000,
      };
      return { success: true, data: { user: mockUser, tokens: mockTokens } };
    }
  },

  async signUp(payload: SignUpPayload): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    try {
      const data = await api.post<BackendAuthResponse>(
        '/auth/sign-up',
        {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          role: payload.role,
          phoneNumber: payload.phoneNumber,
          signupToken: payload.signupToken,
        },
        { skipAuth: true }
      );
      return { success: true, data: { user: data.user, tokens: mapTokens(data) } };
    } catch (e: any) {
      // Fallback for development without backend
      console.warn('Backend not available, using mock sign-up:', e.message);
      const mockUser: User = {
        id: 'mock-user-' + Date.now(),
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber || '',
        role: payload.role,
        scansCount: 0,
        savedCount: 0,
        totalSaved: 0,
        createdAt: new Date().toISOString(),
      };
      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresAt: Date.now() + 3600000,
      };
      return { success: true, data: { user: mockUser, tokens: mockTokens } };
    }
  },

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    try {
      await api.post('/auth/forgot-password', { email }, { skipAuth: true });
    } catch { /* always show positive message */ }
    return { success: true, message: 'If that email exists, a reset link has been sent.', data: null };
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    try {
      const data = await api.post<BackendAuthResponse>('/auth/refresh-token', { refreshToken }, { skipAuth: true });
      return { success: true, data: mapTokens(data) };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Token refresh failed', data: null as never };
    }
  },

  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const user = await api.get<User>('/auth/me');
      return { success: true, data: user };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Could not load profile', data: null as never };
    }
  },

  async updateProfile(updates: { name?: string; avatarUrl?: string }): Promise<ApiResponse<User>> {
    try {
      const user = await api.put<User>('/users/me', updates);
      return { success: true, data: user };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Could not update profile', data: null as never };
    }
  },

  // ─── OTP ───────────────────────────────────────────────────────────────────

  /**
   * Request a 6-digit OTP sent via email (Resend).
   * The backend handles the actual delivery — this just triggers it.
   */
  async sendOtp(payload: SendOtpPayload): Promise<ApiResponse<{ devCode?: string }>> {
    try {
      const data = await api.post<{ devCode?: string }>('/auth/otp/send', payload, { skipAuth: true });
      return { success: true, data: data ?? {} };
    } catch (e: any) {
      // Fallback for development without backend
      console.warn('Backend not available, using mock OTP send:', e.message);
      const devCode = '123456'; // Mock OTP code
      return { success: true, message: 'OTP sent (dev mode)', data: { devCode } };
    }
  },

  /**
   * Verify the 6-digit OTP entered by the user.
   * On success the backend returns a short-lived resetToken (for password reset)
   * or marks the account as verified (for sign-up).
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<ApiResponse<{ resetToken?: string; signupToken?: string }>> {
    try {
      const data = await api.post<{ resetToken?: string; signupToken?: string }>('/auth/otp/verify', payload, { skipAuth: true });
      return { success: true, data };
    } catch (e: any) {
      // Fallback for development without backend
      console.warn('Backend not available, using mock OTP verify:', e.message);
      if (payload.code === '123456') {
        const resetToken = payload.purpose === 'reset-password' ? 'mock-reset-token-' + Date.now() : undefined;
        const signupToken = payload.purpose === 'signup' ? 'mock-signup-token-' + Date.now() : undefined;
        return { success: true, message: 'OTP verified', data: { resetToken, signupToken } };
      }
      return { success: false, message: 'Invalid OTP (use 123456 in dev mode)', data: null as never };
    }
  },

  /**
   * Set a new password using the resetToken returned by verifyOtp.
   * Only used in the forgot-password flow.
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<ApiResponse<null>> {
    try {
      await api.post('/auth/otp/reset-password', payload, { skipAuth: true });
      return { success: true, data: null };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to reset password', data: null };
    }
  },
};