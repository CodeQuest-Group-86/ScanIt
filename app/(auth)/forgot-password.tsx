/**
 * app/(auth)/forgot-password.tsx
 *
 * Step 1 of the OTP password-reset flow.
 */

import Button from '@/components/Button';
import Chip from '@/components/Chip';
import Input from '@/components/Input';
import AuthScreenLayout from '@/components/ui/AuthScreenLayout';
import { authService } from '@/services/auth';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import type { OtpChannel } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

const STEPS = ['Send code', 'Verify', 'New password'] as const;

export default function ForgotPasswordScreen() {
  const [channel, setChannel] = useState<OtpChannel>('sms');
  const [contact, setContact] = useState('');
  const [contactError, setContactError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateContact = () => {
    if (!contact.trim()) { setContactError('This field is required'); return false; }
    if (channel === 'email' && !/\S+@\S+\.\S+/.test(contact)) {
      setContactError('Enter a valid email'); return false;
    }
    if (channel === 'sms' && !/^\+?[0-9]{9,15}$/.test(contact.replace(/\s/g, ''))) {
      setContactError('Enter a valid phone number (e.g. +233201234567)'); return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (!validateContact()) return;
    setContactError('');
    setLoading(true);

    const normalised = channel === 'sms' ? contact.replace(/\s/g, '') : contact.trim();
    const res = await authService.sendOtp({ contact: normalised, channel, purpose: 'reset-password' });
    setLoading(false);

    if (!res.success) {
      setContactError(res.message ?? 'Failed to send OTP. Please try again.');
      return;
    }

    router.push({
      pathname: '/(auth)/verify-otp',
      params: { contact: normalised, channel, purpose: 'reset-password' },
    });
  };

  return (
    <AuthScreenLayout
      lottie="auth-forgot"
      title="Forgot password?"
      subtitle="No worries — we'll send a verification code so you can reset it securely."
      compact
      headerExtra={
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
          <Text style={styles.backText}>Back to sign in</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.channelRow}>
        <Chip
          label="Phone (SMS)"
          active={channel === 'sms'}
          onPress={() => { setChannel('sms'); setContact(''); setContactError(''); }}
          style={styles.channelChip}
        />
        <Chip
          label="Email"
          active={channel === 'email'}
          onPress={() => { setChannel('email'); setContact(''); setContactError(''); }}
          style={styles.channelChip}
        />
      </View>

      {channel === 'sms' ? (
        <Input
          label="Phone Number"
          placeholder="+233201234567"
          value={contact}
          onChangeText={text => { setContact(text); setContactError(''); }}
          keyboardType="phone-pad"
          leftIcon="call-outline"
          error={contactError}
        />
      ) : (
        <Input
          label="Email Address"
          placeholder="you@example.com"
          value={contact}
          onChangeText={text => { setContact(text); setContactError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
          error={contactError}
        />
      )}

      <Button label="Send Verification Code" onPress={handleSend} loading={loading} fullWidth size="lg" />

      <View style={styles.steps}>
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <Animated.View entering={FadeInRight.delay(i * 80).springify()} style={styles.stepItem}>
              <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i === 0 && styles.stepNumActive]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{label}</Text>
            </Animated.View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i === 0 && styles.stepLineActive]} />}
          </React.Fragment>
        ))}
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
  channelRow: { flexDirection: 'row', gap: Spacing.md },
  channelChip: { flex: 1 },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  stepItem: { alignItems: 'center', gap: Spacing.xs },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepNum: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, color: Colors.textSecondary },
  stepNumActive: { color: Colors.white },
  stepLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  stepLabelActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  stepLine: { width: 28, height: 2, backgroundColor: Colors.border, marginBottom: Spacing.lg },
  stepLineActive: { backgroundColor: Colors.primary + '55' },
});
