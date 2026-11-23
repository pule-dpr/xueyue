export type ApiUser = {
  id: string;
  phone?: string;
  name: string;
  initial: string;
  color: string;
  phoneVerified: boolean;
  ridesTogether: number;
  vehicleModel: string;
  vehicleColor: string;
  plateNumber: string;
};

export type LoginCodeChallenge = {
  challengeId: string;
  expiresAt: string;
  delivery: 'development';
  devCode?: string;
};

export type LoginSession = {
  token: string;
  expiresAt: string;
  user: ApiUser;
};

export type ApiHealth = {
  ok: boolean;
  service: string;
  time: string;
};

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

export const remoteApiConfigured = Boolean(apiUrl);

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function getApiHealth(): Promise<ApiHealth> {
  return apiRequest<ApiHealth>('/health');
}

export async function requestLoginCode(phone: string): Promise<LoginCodeChallenge> {
  return apiRequest<LoginCodeChallenge>('/v1/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyLoginCode(input: {
  phone: string;
  challengeId: string;
  code: string;
}): Promise<LoginSession> {
  return apiRequest<LoginSession>('/v1/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateRemoteProfile(
  token: string,
  input: Partial<
    Pick<ApiUser, 'name' | 'vehicleModel' | 'vehicleColor' | 'plateNumber'>
  >,
): Promise<ApiUser> {
  const response = await apiRequest<{ user: ApiUser }>('/v1/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return response.user;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiUrl) {
    throw new ApiError(503, 'api_not_configured', '尚未配置雪约 API 地址。');
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { code?: string; message?: string } })
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'api_error',
      body?.error?.message ?? '服务请求失败。',
    );
  }
  return body as T;
}
