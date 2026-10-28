import {
  GOOGLE_AUTH_URL,
  GOOGLE_SCOPES,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  googleConfig,
} from '../config/google';
import { HttpError } from '../utils/httpError';

export interface GoogleTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export function buildAuthUrl(state: string, codeChallenge: string) {
  const { clientId, redirectUri } = googleConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    // offline + consent so google hands back a refresh token every time
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

async function postToken(body: Record<string, string>): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // invalid_grant means the refresh token is dead (revoked or expired)
    const code = typeof json.error === 'string' ? json.error : 'token_error';
    throw new HttpError(res.status === 400 ? 401 : 502, `google token request failed: ${code}`);
  }

  return json as GoogleTokens;
}

export function exchangeCode(code: string, codeVerifier: string) {
  const { clientId, clientSecret, redirectUri } = googleConfig();

  return postToken({
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
}

export function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = googleConfig();

  return postToken({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
}

export async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new HttpError(502, 'could not load google profile');

  return res.json() as Promise<GoogleProfile>;
}
