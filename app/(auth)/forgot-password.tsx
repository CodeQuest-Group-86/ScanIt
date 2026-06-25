/**
 * app/(auth)/forgot-password.tsx
 *
 * Step 1 of the OTP password-reset flow.
 * User enters their phone number or email → OTP sent → navigate to verify-otp.
 * Steps 2 & 3 are handled by verify-otp.tsx → reset-password.tsx.
 */

import Button from '@/components/Button';
import Chip from '@/components/Chip';
import Input from '@/components/Input';
import { authService } from '@/services/auth';
import { Colors, Spacing, Typography } from '@/theme';
import type { OtpChannel } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Choose how you&apos;d like to receive your verification code.
        </Text>

        {/* Channel toggle */}
        <View style={styles.channelRow}>
          <Chip label="📱 Phone (SMS)" active={channel === 'sms'} onPress={() => { setChannel('sms'); setContact(''); setContactError(''); }} style={styles.channelChip} />
          <Chip label="✉️ Email" active={channel === 'email'} onPress={() => { setChannel('email'); setContact(''); setContactError(''); }} style={styles.channelChip} />
        </View>

        <View style={styles.form}>
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
        </View>

        {/* Flow indicator */}
        <View style={styles.steps}>
          {['Send code', 'Verify', 'New password'].map((s, i) => (
            <React.Fragment key={s}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
                  <Text style={[styles.stepNum, i === 0 && styles.stepNumActive]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{s}</Text>
              </View>
              {i < 2 && <View style={styles.stepLine} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, padding: Spacing.xl },
  back: { marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.extrabold, color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.sizes.md, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  channelRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  channelChip: { flex: 1 },
  form: { gap: Spacing.lg },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xxxl, gap: 0 },
  stepItem: { alignItems: 'center', gap: Spacing.xs },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border ?? '#D0C4B8', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepNum: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, color: Colors.textSecondary },
  stepNumActive: { color: Colors.white },
  stepLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  stepLabelActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  stepLine: { width: 32, height: 2, backgroundColor: Colors.border ?? '#D0C4B8', marginBottom: Spacing.lg },
});
