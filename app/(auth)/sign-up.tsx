import AuthMotionBackground from '@/components/AuthMotionBackground';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import GlassCard from '@/components/GlassCard';
import Input from '@/components/Input';
import { authService } from '@/services/auth';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import type { Role } from '@/types';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<Role>('consumer');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\+?[0-9]{9,15}$/.test(phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid phone number (e.g. +233201234567)';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);

    // Send OTP to email — delivered via Resend (free tier, 3,000/month)
    const res = await authService.sendOtp({
      contact: email.trim(),
      channel: 'email',
      purpose: 'signup',
    });

    setLoading(false);

    if (!res.success) {
      setErrors({ email: res.message ?? 'Failed to send verification code. Try again.' });
      return;
    }

    router.push({
      pathname: '/(auth)/verify-otp',
      params: {
        contact: email.trim(),
        channel: 'email',
        purpose: 'signup',
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        devCode: res.data?.devCode ?? '',
      },
    });
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
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <GlassCard intensity={50} tint="light" style={styles.glassForm}>
          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>I am a</Text>
            <View style={styles.roleRow}>
              <Chip label="Consumer" active={role === 'consumer'} onPress={() => setRole('consumer')} style={styles.roleChip} />
              <Chip label="Seller" active={role === 'seller'} onPress={() => setRole('seller')} style={styles.roleChip} />
            </View>
          </View>

          <Input label="Full Name" placeholder="Ama Mensah" value={name} onChangeText={setName} leftIcon="person-outline" error={errors.name} autoCapitalize="words" />
          <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" error={errors.email} />
          <Input label="Phone Number" placeholder="+233201234567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" leftIcon="call-outline" error={errors.phone} />
          <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} isPassword leftIcon="lock-closed-outline" error={errors.password} />
          <Input label="Confirm Password" placeholder="••••••••" value={confirm} onChangeText={setConfirm} isPassword leftIcon="lock-closed-outline" error={errors.confirm} />

          <Button label="Send Verification Code" onPress={handleSignUp} loading={loading} fullWidth size="lg" />
          </GlassCard>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  header: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  logoScan: { fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.extrabold, color: Colors.text },
  logoIt: { fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.extrabold, color: Colors.primary },
  tagline: { fontSize: Typography.sizes.lg, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  form: { gap: Spacing.lg },
  glassForm: { gap: Spacing.lg },
  roleSection: { gap: Spacing.sm },
  roleLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.text },
  roleRow: { flexDirection: 'row', gap: Spacing.md },
  roleChip: { flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: Spacing.xl },
  footerText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  link: { fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.bold },
});
