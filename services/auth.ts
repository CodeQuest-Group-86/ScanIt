import type { ApiResponse, AuthTokens, LoginPayload, SignUpPayload, User } from '@/types';

const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Ama Mensah',
    email: 'ama.m@scanit.app',
    role: 'consumer',
    scansCount: 47,
    savedCount: 12,
    totalSaved: 84.5,
    createdAt: '2024-01-15',
  },
  {
    id: 'u2',
    name: 'Kofi Asante',
    email: 'kofi@scanit.app',
    role: 'seller',
    scansCount: 120,
    savedCount: 35,
    totalSaved: 320.0,
    createdAt: '2024-02-20',
  },
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function makeTokens(): AuthTokens {
  return {
    accessToken: `mock_access_${Date.now()}`,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    await delay(800);
    const user = MOCK_USERS.find(u => u.email === payload.email);
    if (!user || payload.password.length < 6) {
      return { success: false, message: 'Invalid email or password', data: null as never };
    }
    return { success: true, data: { user, tokens: makeTokens() } };
  },

  async signUp(payload: SignUpPayload): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    await delay(1000);
    const existing = MOCK_USERS.find(u => u.email === payload.email);
    if (existing) {
      return { success: false, message: 'An account with this email already exists', data: null as never };
    }
    const newUser: User = {
      id: `u${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      scansCount: 0,
      savedCount: 0,
      totalSaved: 0,
      createdAt: new Date().toISOString(),
    };
    MOCK_USERS.push(newUser);
    return { success: true, data: { user: newUser, tokens: makeTokens() } };
  },

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    await delay(600);
    return { success: true, message: 'Reset link sent to your email', data: null };
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    await delay(300);
    return { success: true, data: makeTokens() };
  },

  async getProfile(userId: string): Promise<ApiResponse<User>> {
    await delay(400);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found', data: null as never };
    return { success: true, data: user };
  },
};
