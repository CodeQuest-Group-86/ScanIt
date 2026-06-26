import AuthMotionBackground from '@/components/AuthMotionBackground';
import Button from '@/components/Button';
import GlassCard from '@/components/GlassCard';
import Input from '@/components/Input';
import { useAuthStore } from '@/stores/auth';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={styles.safe}>
      <AuthMotionBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoScan}>Scan</Text>
            <Text style={styles.logoIt}>It</Text>
          </View>
          <Text style={styles.tagline}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <GlassCard intensity={50} tint="light" style={styles.glassForm}>
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

          </GlassCard>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  header: { alignItems: 'center', paddingVertical: Spacing.section },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  logoScan: { fontSize: Typography.sizes.display, fontWeight: Typography.weights.extrabold, color: Colors.text },
  logoIt: { fontSize: Typography.sizes.display, fontWeight: Typography.weights.extrabold, color: Colors.primary },
  tagline: { fontSize: Typography.sizes.lg, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  form: { gap: Spacing.lg },
  glassForm: { gap: Spacing.lg },
  errorBanner: { backgroundColor: Colors.danger + '20', borderRadius: Radii.md, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.danger },
  errorBannerText: { color: Colors.danger, fontSize: Typography.sizes.sm },
  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing.sm },
  forgot: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: Typography.weights.medium },
  hintBox: { backgroundColor: Colors.accent + '15', borderRadius: Radii.md, padding: Spacing.md, gap: 2 },
  hintTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.accent, marginBottom: 4 },
  hintText: { fontSize: Typography.sizes.sm, color: Colors.text },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: Spacing.xl },
  footerText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  link: { fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.bold },
});
