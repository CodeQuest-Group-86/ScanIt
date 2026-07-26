/**
 * services/googleAuth.ts
 *
 * Google Sign-In via expo-auth-session's ID-token flow.
 *
 * IMPORTANT: expo-auth-session's native (Android/iOS) flow validates against your app's
 * real package name / signing certificate — it cannot complete inside Expo Go, which is a
 * shared shell app with its own identity (host.exp.exponent), not com.nonydev27.scanit.
 * To actually test this on a device, use a development build (`eas build --profile
 * development`) or a preview/production build, not Expo Go. It DOES work in `expo start
 * --web` today, since the web flow only needs the Web client ID + a localhost redirect URI
 * registered in Google Cloud Console.
 *
 * Setup (Google Cloud Console): create an OAuth consent screen, then OAuth Client ID(s),
 * and put them in .env.local. See docs/DEPLOYMENT.md.
 */
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export function isGoogleSignInConfigured(): boolean {
  return Boolean(WEB_CLIENT_ID || IOS_CLIENT_ID || ANDROID_CLIENT_ID);
}

/**
 * expo-auth-session requires a client ID for the *current* platform specifically
 * (androidClientId on Android, iosClientId on iOS, webClientId elsewhere) — it throws
 * synchronously if that one is missing, even if another platform's ID is set. Use this
 * (not isGoogleSignInConfigured) to decide whether to mount the Google button/hook at all.
 */
export function isGoogleSignInAvailableOnThisPlatform(): boolean {
  if (Platform.OS === 'ios') return Boolean(IOS_CLIENT_ID);
  if (Platform.OS === 'android') return Boolean(ANDROID_CLIENT_ID);
  return Boolean(WEB_CLIENT_ID);
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
