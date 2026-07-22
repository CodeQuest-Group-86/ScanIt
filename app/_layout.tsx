import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaystackProvider } from 'react-native-paystack-webview';
import { useAuthStore } from '@/stores/auth';
import { useSavedStore } from '@/stores/saved';
import { useScanStore } from '@/stores/scan';
import { paymentService } from '@/services/payment';
import { registerForPushNotifications } from '@/services/notifications';
import { warmUpBackend } from '@/utils/api';

export default function RootLayout() {
  const initialize = useAuthStore(s => s.initialize);
  const user = useAuthStore(s => s.user);
  const loadSaved = useSavedStore(s => s.load);
  const initQuota = useScanStore(s => s.initQuota);

  useEffect(() => {
    // Fire-and-forget — wakes a sleeping Render instance early so sign-in/scan
    // don't eat the 30-50s cold-start delay later.
    warmUpBackend();
    initialize();
    loadSaved();
    initQuota();
  }, []);

  useEffect(() => {
    // Requires a signed-in user — the backend endpoint needs a JWT.
    if (user) registerForPushNotifications();
  }, [user]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaystackProvider
        publicKey={paymentService.getPublicKey()}
        currency="GHS"
        defaultChannels={['card', 'mobile_money']}
        debug={__DEV__}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scan-result" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="recommendations" options={{ headerShown: false }} />
          <Stack.Screen name="scan-history" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="help" options={{ headerShown: false }} />
          <Stack.Screen name="product-detail" options={{ headerShown: false }} />
          <Stack.Screen name="seller-inventory" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </PaystackProvider>
    </GestureHandlerRootView>
  );
}
