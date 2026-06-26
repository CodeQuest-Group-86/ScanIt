/**
 * app/(auth)/verify-otp.tsx
 */

import Button from '@/components/Button';
import AuthScreenLayout from '@/components/ui/AuthScreenLayout';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import type { OtpChannel } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{
    contact: string;
    channel: OtpChannel;
    purpose: 'signup' | 'reset-password';
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    devCode?: string;
  }>();

  const { contact, channel, purpose } = params;
  const devCode = params.devCode && params.devCode.length === OTP_LENGTH ? params.devCode : '';

  const [digits, setDigits] = useState<string[]>(
    devCode ? devCode.split('') : Array(OTP_LENGTH).fill(''),
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [otpVerified, setOtpVerified] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { signUp } = useAuthStore();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const code = digits.join('');

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setResendTimer(RESEND_SECONDS);
    setError('');
    setOtpVerified(false);
    const res = await authService.sendOtp({ contact, channel, purpose });
    if (res.success && res.data?.devCode) {
      setDigits(res.data.devCode.split(''));
    }
  };

  const handleVerify = async () => {
    if (code.length < OTP_LENGTH) { setError('Enter the full 6-digit code'); return; }
    setLoading(true);
    setError('');

    if (!otpVerified) {
      const res = await authService.verifyOtp({ contact, code, purpose });

      if (!res.success) {
        setError(res.message ?? 'Invalid or expired code');
        setLoading(false);
        return;
      }

      if (purpose === 'reset-password') {
        const resetToken = res.data?.resetToken ?? '';
        setLoading(false);
        router.replace({
          pathname: '/(auth)/reset-password',
          params: { contact, resetToken },
        });
        return;
      }

      setOtpVerified(true);
    }

    const ok = await signUp(
      params.name ?? '',
      params.email ?? contact,
      params.password ?? '',
      (params.role as 'consumer' | 'seller') ?? 'consumer',
    );

    setLoading(false);
    if (ok) {
      router.replace('/(tabs)/explore');
    } else {
      const storeErr = useAuthStore.getState().error ?? '';
      if (storeErr.toLowerCase().includes('already exists')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError('Account creation failed. Please try again.');
      }
    }
  };

  return (
    <AuthScreenLayout
      lottie="auth-verify"
      title="Enter verification code"
      subtitle={`We sent a 6-digit code to ${contact}`}
      compact
      headerExtra={
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      }
    >
      {devCode ? (
        <Animated.View entering={FadeIn} style={styles.devBanner}>
          <Ionicons name="code-slash-outline" size={14} color={Colors.accent} />
          <Text style={styles.devBannerText}>Dev mode — code pre-filled: {devCode}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.otpRow}>
        {digits.map((d, i) => (
          <Animated.View key={i} entering={ZoomIn.delay(i * 45).springify().damping(14)}>
            <TextInput
              ref={r => { inputRefs.current[i] = r; }}
              style={[styles.otpBox, d ? styles.otpBoxFilled : null, error ? styles.otpBoxError : null]}
              value={d}
              onChangeText={t => handleChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              accessible
              accessibilityLabel={`Digit ${i + 1}`}
            />
          </Animated.View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        label={loading ? '' : 'Verify'}
        onPress={handleVerify}
        loading={loading}
        fullWidth
        size="lg"
      />

      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>Didn&apos;t receive it? </Text>
        {resendTimer > 0 ? (
          <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  backText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent + '18',
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  devBannerText: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: Typography.weights.medium },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  otpBox: {
    width: 44,
    height: 54,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    textAlign: 'center',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  otpBoxError: { borderColor: Colors.danger },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.sm },
  resendLabel: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  timerText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  resendLink: { fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.bold },
});
