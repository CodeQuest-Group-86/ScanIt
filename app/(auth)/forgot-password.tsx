import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authService } from '@/services/auth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Colors, Spacing, Typography, Radii } from '@/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { setEmailError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email'); return; }
    setEmailError('');
    setLoading(true);
    await authService.forgotPassword(email.trim());
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.successIcon}>
            <Ionicons name="mail-open-outline" size={64} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a password reset link to {'\n'}<Text style={styles.email}>{email}</Text>
          </Text>
          <Button label="Back to Sign In" onPress={() => router.replace('/(auth)/sign-in')} fullWidth size="lg" style={styles.btn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email and we&apos;ll send you a reset link.</Text>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            error={emailError}
          />
          <Button label="Send Reset Link" onPress={handleSubmit} loading={loading} fullWidth size="lg" />
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
  subtitle: { fontSize: Typography.sizes.md, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xxxl },
  email: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  form: { gap: Spacing.lg },
  btn: { marginTop: Spacing.md },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xxxl,
    marginTop: Spacing.section,
  },
});
