import Button from "@/components/Button";
import Chip from "@/components/Chip";
import Input from "@/components/Input";
import AuthScreenLayout from "@/components/ui/AuthScreenLayout";
import { authService } from "@/services/auth";
import { Colors, Spacing, Typography } from "@/theme";
import type { Role } from "@/types";
import { Link, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;
const PASSWORD_REVEAL_DELAY_MS = 250;

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("consumer");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRevealTimer = () => {
    if (revealTimer.current) {
      clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
  };

  useEffect(() => clearRevealTimer, []);

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    clearRevealTimer();
    setShowPassword(false);
  };

  const handlePhoneBlur = () => {
    clearRevealTimer();
    if (PHONE_REGEX.test(phone.replace(/\s/g, ""))) {
      revealTimer.current = setTimeout(
        () => setShowPassword(true),
        PASSWORD_REVEAL_DELAY_MS,
      );
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";

    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email!";

    if (!phone.trim()) e.phone = "Phone number is required";
    else if (!PHONE_REGEX.test(phone.replace(/\s/g, "")))
      e.phone = "Enter a valid phone number (e.g. +233207384908)";

    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "At least 6 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);

    const res = await authService.sendOtp({
      contact: email.trim(),
      channel: "email",
      purpose: "signup",
    });

    setLoading(false);

    if (!res.success) {
      setErrors({
        email: res.message ?? "Failed to send verification code. Try again.",
      });
      return;
    }

    router.push({
      pathname: "/(auth)/verify-otp",
      params: {
        contact: email.trim(),
        channel: "email",
        purpose: "signup",
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      },
    });
  };

  return (
    <AuthScreenLayout
      title="Join ScanIt"
      subtitle="Create your account and start scanning products across Ghana in seconds."
      compact
      centered
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      }
    >
      <View style={styles.roleSection}>
        <View style={styles.roleRow}>
          <Chip
            label="Consumer"
            active={role === "consumer"}
            onPress={() => setRole("consumer")}
            style={styles.roleChip}
          />
          <Chip
            label="Seller"
            active={role === "seller"}
            onPress={() => setRole("seller")}
            style={styles.roleChip}
          />
        </View>
      </View>

      <Input
        label="Full Name"
        placeholder="Festus Kwadzokpo"
        value={name}
        onChangeText={setName}
        leftIcon="person-outline"
        error={errors.name}
        autoCapitalize="words"
      />
      <Input
        label="Email"
        placeholder="someone@scanit.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail-outline"
        error={errors.email}
      />
      <Input
        label="Phone Number"
        placeholder="+23320XXXXXXX"
        value={phone}
        onChangeText={handlePhoneChange}
        onBlur={handlePhoneBlur}
        keyboardType="phone-pad"
        leftIcon="call-outline"
        error={errors.phone}
      />

      {showPassword ? (
        <Animated.View
          entering={FadeInDown.duration(420).springify().damping(16)}
          exiting={FadeOutUp.duration(200)}
          style={styles.passwordSection}
        >
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SET A PASSWORD</Text>
            <View style={styles.dividerLine} />
          </View>

          <Input
            label="Password"
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
        </Animated.View>
      ) : null}

      <Button
        label="Create Account"
        onPress={handleSignUp}
        loading={loading}
        fullWidth
        size="lg"
        variant="gradient"
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  roleSection: { gap: Spacing.sm },
  roleRow: { flexDirection: "row", gap: Spacing.md },
  roleChip: { flex: 1 },
  passwordSection: { gap: Spacing.lg },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  footerRow: { flexDirection: "row", alignItems: "center" },
  footerText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  link: {
    fontSize: Typography.sizes.md,
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
});
