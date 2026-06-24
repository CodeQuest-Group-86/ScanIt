import { api } from '@/utils/api';
import type {
  ApiResponse,
  AuthTokens,
  LoginPayload,
  SignUpPayload,
  User,
  SendOtpPayload,
  VerifyOtpPayload,
  ResetPasswordPayload,
} from '@/types';

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
      return { success: false, message: e.message ?? 'Login failed', data: null as never };
    }
  },

  async signUp(payload: SignUpPayload): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    try {
      const data = await api.post<BackendAuthResponse>(
        '/auth/sign-up',
        { name: payload.name, email: payload.email, password: payload.password, role: payload.role },
        { skipAuth: true }
      );
      return { success: true, data: { user: data.user, tokens: mapTokens(data) } };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Sign up failed', data: null as never };
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

  // ─── OTP ───────────────────────────────────────────────────────────────────

  /**
   * Request a 6-digit OTP sent via email (Resend) or SMS (Twilio Verify).
   * The backend handles the actual delivery — this just triggers it.
   */
  async sendOtp(payload: SendOtpPayload): Promise<ApiResponse<null>> {
    try {
      await api.post('/auth/otp/send', payload, { skipAuth: true });
      return { success: true, data: null };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to send OTP', data: null };
    }
  },

  /**
   * Verify the 6-digit OTP entered by the user.
   * On success the backend returns a short-lived resetToken (for password reset)
   * or marks the account as verified (for sign-up).
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<ApiResponse<{ resetToken?: string }>> {
    try {
      const data = await api.post<{ resetToken?: string }>('/auth/otp/verify', payload, { skipAuth: true });
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Invalid or expired OTP', data: null as never };
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
