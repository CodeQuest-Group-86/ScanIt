import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '@/stores/auth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Colors, Spacing, Typography, Radii } from '@/theme';
import { getInitials } from '@/utils/format';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    updateUser({ name: name.trim(), email: email.trim() });
    setLoading(false);
    Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{getInitials(name || (user?.name ?? '?'))}</Text>
          </View>
          <TouchableOpacity style={styles.changeAvatarBtn}>
            <Text style={styles.changeAvatarText}>Change photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            leftIcon="person-outline"
            autoCapitalize="words"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
          />
          <View style={styles.roleRow}>
            <Text style={styles.roleLabel}>Role</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{user?.role === 'seller' ? 'Seller' : 'Consumer'}</Text>
            </View>
          </View>
          <Button label="Save Changes" onPress={handleSave} loading={loading} fullWidth size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  scroll: { padding: Spacing.lg, gap: Spacing.xl },
  avatarSection: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.white },
  changeAvatarBtn: {},
  changeAvatarText: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: Typography.weights.medium },
  form: { gap: Spacing.lg },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.text },
  rolePill: { backgroundColor: Colors.accent + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill },
  rolePillText: { color: Colors.accent, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
});
