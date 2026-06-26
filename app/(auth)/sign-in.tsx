import Button from '@/components/Button';
import Input from '@/components/Input';
import AuthScreenLayout from '@/components/ui/AuthScreenLayout';
import { useAuthStore } from '@/stores/auth';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, isLoading, error, clearError } = useAuthStore();

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    const ok = await login(email.trim(), password);
    if (ok) router.replace('/(tabs)/explore');
  };

  return (
    <AuthScreenLayout
      lottie="auth-login"
      title="Welcome back"
      subtitle="Sign in to scan products, compare Ghana prices, and verify authenticity."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      }
    >
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        leftIcon="mail-outline"
        error={errors.email}
      />
      <Input
        label="Password"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        isPassword
        leftIcon="lock-closed-outline"
        error={errors.password}
      />

      <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </TouchableOpacity>

      <Button label="Sign In" onPress={handleLogin} loading={isLoading} fullWidth size="lg" />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: Colors.danger + '20',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  errorBannerText: { color: Colors.danger, fontSize: Typography.sizes.sm },
  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing.sm },
  forgot: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: Typography.weights.medium },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  link: { fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.bold },
});
