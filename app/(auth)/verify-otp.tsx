/**
 * app/(auth)/verify-otp.tsx
 *
 * Shared OTP verification screen used by two flows:
 *   • Sign-up  — verifies phone/email before creating the account session
 *   • Forgot password — verifies identity before allowing password reset
 *
 * Query params (passed via router.push):
 *   contact  — the phone number or email that received the OTP
 *   channel  — 'sms' | 'email'
 *   purpose  — 'signup' | 'reset-password'
 *   name / password / role — forwarded from sign-up for final account creation
 */

import AuthMotionBackground from '@/components/AuthMotionBackground';
import Button from '@/components/Button';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import type { OtpChannel } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    devCode ? devCode.split('') : Array(OTP_LENGTH).fill('')
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  // Once the OTP is verified we skip re-verification on retry (e.g. if signUp fails)
  const [otpVerified, setOtpVerified] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { signUp } = useAuthStore();

  // Countdown timer for resend
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
    setOtpVerified(false); // reset so the new OTP is verified fresh
    const res = await authService.sendOtp({ contact, channel, purpose });
    if (res.success && res.data?.devCode) {
      setDigits(res.data.devCode.split(''));
    }
  };

  const handleVerify = async () => {
    if (code.length < OTP_LENGTH) { setError('Enter the full 6-digit code'); return; }
    setLoading(true);
    setError('');

    // If OTP was already verified in a previous attempt (signUp failed), skip re-verification
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

    // signup — create the account with the email forwarded from sign-up params
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

  const channelLabel = contact;

  return (
    <SafeAreaView style={styles.safe}>
      <AuthMotionBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons
              name={channel === 'sms' ? 'phone-portrait-outline' : 'mail-open-outline'}
              size={48}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.title}>Enter verification code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.contact}>{channelLabel}</Text>
          </Text>

          {/* Dev mode banner */}
          {devCode ? (
            <View style={styles.devBanner}>
              <Ionicons name="code-slash-outline" size={14} color={Colors.accent} />
              <Text style={styles.devBannerText}>Dev mode — code pre-filled: {devCode}</Text>
            </View>
          ) : null}

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
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
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label={loading ? '' : 'Verify'}
            onPress={handleVerify}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.btn}
          />

          {/* Resend */}
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: Spacing.xl },
  back: { marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxxl,
  },
  contact: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  otpBox: {
    width: 46, height: 56,
    borderWidth: 1.5, borderColor: Colors.border ?? '#D0C4B8',
    borderRadius: Radii.md,
    textAlign: 'center',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  otpBoxError: { borderColor: Colors.danger },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  btn: { marginTop: Spacing.sm },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  resendLabel: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  timerText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  resendLink: { fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.bold },
  devBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent + '18', borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.md },
  devBannerText: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: Typography.weights.medium },
});
