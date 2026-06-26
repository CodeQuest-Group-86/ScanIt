import LottieView from 'lottie-react-native';
import React, { useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

export const LottieSources = {
  scan: require('@/assets/lottie/scan.json'),
  shopping: require('@/assets/lottie/shopping.json'),
  smart: require('@/assets/lottie/smart.json'),
  loading: require('@/assets/lottie/loading.json'),
  'auth-login': require('@/assets/lottie/auth-login.json'),
  'auth-signup': require('@/assets/lottie/auth-signup.json'),
  'auth-forgot': require('@/assets/lottie/auth-forgot.json'),
  'auth-verify': require('@/assets/lottie/auth-verify.json'),
} as const;

export type LottieSourceKey = keyof typeof LottieSources;

interface LottieAnimProps {
  source: LottieSourceKey;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: ViewStyle;
  /** Optional override map (used by AuthScreenLayout to avoid circular imports). */
  sources?: Record<string, unknown>;
}

export default function LottieAnim({
  source,
  size = 200,
  loop = true,
  autoPlay = true,
  style,
  sources,
}: LottieAnimProps) {
  const ref = useRef<LottieView>(null);
  const map = sources ?? LottieSources;
  const json = map[source];

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <LottieView
        ref={ref}
        source={json as never}
        style={{ width: size, height: size }}
        loop={loop}
        autoPlay={autoPlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
