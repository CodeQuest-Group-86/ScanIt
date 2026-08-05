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

/** api.ts prefixes HTTP errors as "400: message" — strip that for UI copy. */
function stripStatusPrefix(message?: string): string {
  if (!message) return '';
  return message.replace(/^\d{3}:\s*/, '').trim();
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
      const message = stripStatusPrefix(e?.message) || 'Login failed. Please try again.';
      return { success: false, message, data: null as never };
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
        },
        { skipAuth: true }
      );
      return { success: true, data: { user: data.user, tokens: mapTokens(data) } };
    } catch (e: any) {
      const message = stripStatusPrefix(e?.message) || 'Account creation failed. Please try again.';
      return { success: false, message, data: null as never };
    }
  },

  async loginWithGoogle(idToken: string): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    try {
      const data = await api.post<BackendAuthResponse>(
        '/auth/oauth/google',
        { idToken },
        { skipAuth: true }
      );
      return { success: true, data: { user: data.user, tokens: mapTokens(data) } };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Google sign-in failed', data: null as never };
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
   * Request a 6-digit OTP sent via email (Resend) or SMS (Twilio Verify).
   * The backend delivers the code — the client never receives it.
   */
  async sendOtp(payload: SendOtpPayload): Promise<ApiResponse<null>> {
    try {
      await api.post('/auth/otp/send', payload, { skipAuth: true });
      return { success: true, message: 'OTP sent', data: null };
    } catch (e: any) {
      const message = stripStatusPrefix(e?.message) || 'Failed to send verification code. Please try again.';
      return { success: false, message, data: null };
    }
  },

  /**
   * Verify the 6-digit OTP the user received by email/SMS.
   * On success the backend returns a short-lived resetToken (for password reset)
   * or marks the account as verified (for sign-up).
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<ApiResponse<{ resetToken?: string }>> {
    try {
      const data = await api.post<{ resetToken?: string }>('/auth/otp/verify', payload, { skipAuth: true });
      return { success: true, data: data ?? {} };
    } catch (e: any) {
      const message = stripStatusPrefix(e?.message) || 'Invalid or expired code';
      return { success: false, message, data: null as never };
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