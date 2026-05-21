import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Chip from '@/components/Chip';
import type { Role } from '@/types';
import { Colors, Spacing, Typography, Radii } from '@/theme';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<Role>('consumer');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signUp, isLoading, error, clearError } = useAuthStore();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    clearError();
    if (!validate()) return;
    const ok = await signUp(name.trim(), email.trim(), password, role);
    if (ok) router.replace('/(tabs)/explore' as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoScan}>Scan</Text>
            <Text style={styles.logoIt}>It</Text>
          </View>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>I am a</Text>
            <View style={styles.roleRow}>
              <Chip label="Consumer" active={role === 'consumer'} onPress={() => setRole('consumer')} style={styles.roleChip} />
              <Chip label="Seller" active={role === 'seller'} onPress={() => setRole('seller')} style={styles.roleChip} />
            </View>
          </View>

          <Input label="Full Name" placeholder="Ama Mensah" value={name} onChangeText={setName} leftIcon="person-outline" error={errors.name} autoCapitalize="words" />
          <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" error={errors.email} />
          <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} isPassword leftIcon="lock-closed-outline" error={errors.password} />
          <Input label="Confirm Password" placeholder="••••••••" value={confirm} onChangeText={setConfirm} isPassword leftIcon="lock-closed-outline" error={errors.confirm} />

          <Button label="Create Account" onPress={handleSignUp} loading={isLoading} fullWidth size="lg" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  header: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  logoScan: { fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.extrabold, color: Colors.text },
  logoIt: { fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.extrabold, color: Colors.primary },
  tagline: { fontSize: Typography.sizes.lg, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  form: { gap: Spacing.lg },
  errorBanner: { backgroundColor: Colors.danger + '20', borderRadius: Radii.md, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.danger },
  errorBannerText: { color: Colors.danger, fontSize: Typography.sizes.sm },
  roleSection: { gap: Spacing.sm },
  roleLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.text },
  roleRow: { flexDirection: 'row', gap: Spacing.md },
  roleChip: { flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: Spacing.xl },
  footerText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  link: { fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.bold },
});
