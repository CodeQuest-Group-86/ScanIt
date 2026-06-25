/**
 * utils/api.ts
 * Authenticated HTTP client for the ScanIt Spring Boot backend.
 *
 * - Reads API_URL from EXPO_PUBLIC_API_URL env var
 * - Attaches Bearer token from SecureStore on every request
 * - On 401, attempts a single token refresh then retries
 * - Falls back gracefully so mock services can still work when backend is offline
 */

import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

const ACCESS_TOKEN_KEY = 'scanit_access_token';
const REFRESH_TOKEN_KEY = 'scanit_refresh_token';

// ─── Token helpers ────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const { accessToken, refreshToken: newRefresh } = json.data ?? json;
    if (accessToken) {
      await saveTokens(accessToken, newRefresh ?? refreshToken);
      return accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Core request ─────────────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  // Don't default Content-Type for FormData — let fetch set the multipart boundary
  const isFormData = fetchOptions.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const doFetch = (token?: string) =>
    fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: token
        ? { ...headers, Authorization: `Bearer ${token}` }
        : headers,
    });

  let response = await doFetch();

  // Auto-refresh on 401
  if (response.status === 401 && !skipAuth) {
    const newToken = await doRefresh();
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

  if (!response.ok) {
    let message = `${response.status}`;
    try {
      const err = await response.json();
      message = err.message ? `${response.status}: ${err.message}` : `${response.status}`;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  // 204 No Content
  if (response.status === 204) return undefined as unknown as T;

  const json = await response.json();
  // Backend wraps responses in { success, data, message } — unwrap to data
  return (json.data !== undefined ? json.data : json) as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, opts?: RequestOptions) {
    return request<T>(path, { ...opts, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(path, { ...opts, method: 'POST', body: JSON.stringify(body) });
  },
  /** Multipart/form-data upload — do NOT set Content-Type, let fetch set the boundary. */
  postForm<T>(path: string, formData: FormData, opts?: RequestOptions) {
    const { ...rest } = opts ?? {};
    return request<T>(path, { ...rest, method: 'POST', body: formData, headers: {} });
  },
  put<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(path, { ...opts, method: 'PUT', body: JSON.stringify(body) });
  },
  delete<T>(path: string, opts?: RequestOptions) {
    return request<T>(path, { ...opts, method: 'DELETE' });
  },
  saveTokens,
};
