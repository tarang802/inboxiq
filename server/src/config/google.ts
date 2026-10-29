import { env } from './env';
import { HttpError } from '../utils/httpError';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
export const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

export const GMAIL_METADATA_SCOPE = 'https://www.googleapis.com/auth/gmail.metadata';

export const GOOGLE_SCOPES = ['openid', 'email', 'profile', GMAIL_METADATA_SCOPE];

// oauth vars are optional at boot so the server still runs without them,
// but anything that talks to google needs all of them
export function googleConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new HttpError(500, 'google oauth is not configured');
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  };
}
