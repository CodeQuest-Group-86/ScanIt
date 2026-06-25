/**
 * app/(auth)/reset-password.tsx
 *
 * Final step of the forgot-password OTP flow.
 * Receives contact + resetToken from verify-otp, lets user set a new password.
 */

import Button from '@/components/Button';
import Input from '@/components/Input';
import { authService } from '@/services/auth';
import { Colors, Spacing, Typography } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const { contact, resetToken } = useLocalSearchParams<{ contact: string; resetToken: string }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const res = await authService.resetPassword({ contact, resetToken, newPassword: password });
    setLoading(false);
    if (res.success) {
      setDone(true);
    } else {
      setErrors({ password: res.message ?? 'Failed to reset password' });
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle-outline" size={64} color={Colors.success ?? Colors.accent} />
          </View>
          <Text style={styles.title}>Password updated!</Text>
          <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
          <Button
            label="Sign In"
            onPress={() => router.replace('/(auth)/sign-in')}
            fullWidth size="lg" style={styles.btn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Set new password</Text>
        <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

        <View style={styles.form}>
          <Input
            label="New Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIcon="lock-closed-outline"
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            placeholder="••••••••"
            value={confirm}
            onChangeText={setConfirm}
            isPassword
            leftIcon="lock-closed-outline"
            error={errors.confirm}
          />
          <Button label="Update Password" onPress={handleSubmit} loading={loading} fullWidth size="lg" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  center: { flex: 1, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xxxl,
    textAlign: 'center',
  },
  form: { gap: Spacing.lg },
  btn: { marginTop: Spacing.md, width: '100%' },
});
