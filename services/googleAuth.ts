/**
 * services/googleAuth.ts
 *
 * Google Sign-In via expo-auth-session's ID-token flow — no custom native module or
 * dev-client rebuild required, works in Expo Go. Inert (never prompts) until at least
 * one of EXPO_PUBLIC_GOOGLE_{WEB,IOS,ANDROID}_CLIENT_ID is set in .env.local.
 *
 * Setup (Google Cloud Console): create an OAuth consent screen, then three OAuth
 * Client IDs (Web, iOS, Android) and put them in .env.local. See docs/DEPLOYMENT.md.
 */
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export function isGoogleSignInConfigured(): boolean {
  return Boolean(WEB_CLIENT_ID || IOS_CLIENT_ID || ANDROID_CLIENT_ID);
}

/**
 * Returns `promptAsync()` to open the Google sign-in flow, and the resulting `idToken`
 * once the user completes it (pass that to `authService.loginWithGoogle`).
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID || undefined,
    iosClientId: IOS_CLIENT_ID || undefined,
    androidClientId: ANDROID_CLIENT_ID || undefined,
  });

  const idToken = response?.type === 'success' ? response.params.id_token : undefined;

  return { request, response, promptAsync, idToken };
}
