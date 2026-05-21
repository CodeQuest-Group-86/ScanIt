import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';

const FAQ = [
  { q: 'How does ScanIt identify products?', a: 'ScanIt uses advanced AI vision technology to analyze product images and match them against our database of products. No barcode or QR code is needed — just point your camera.' },
  { q: 'How accurate is the authenticity check?', a: 'Our authenticity detection uses multiple signals including packaging patterns, brand markings, and seller verification data to provide a confidence score.' },
  { q: 'How are prices updated?', a: "Prices are sourced from verified sellers and updated regularly. Nearby sellers' prices reflect their latest listings." },
  { q: 'What is the scan session limit?', a: 'Each app session allows up to 3 scans. Restarting the app resets your session counter.' },
  { q: 'How do I become a verified seller?', a: 'Contact our support team to start the verification process. Verified sellers gain a badge and higher visibility in search results.' },
];

export default function HelpScreen() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need help?</Text>
          <Text style={styles.contactBody}>Our support team is here for you.</Text>
          <View style={styles.contactBtns}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL('mailto:support@scanit.app')}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
              <Text style={styles.contactBtnText}>Email Us</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL('https://wa.me/233201234567')}>
              <Ionicons name="logo-whatsapp" size={20} color={Colors.success} />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ */}
        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
        {FAQ.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqItem}
            onPress={() => setExpanded(expanded === i ? null : i)}
            activeOpacity={0.8}>
            <View style={styles.faqQuestion}>
              <Text style={styles.faqQuestionText}>{item.q}</Text>
              <Ionicons
                name={expanded === i ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textSecondary}
              />
            </View>
            {expanded === i && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  contactCard: { backgroundColor: Colors.primary, borderRadius: Radii.card, padding: Spacing.xl, marginBottom: Spacing.sm, gap: Spacing.sm },
  contactTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.white },
  contactBody: { fontSize: Typography.sizes.md, color: Colors.white + 'CC' },
  contactBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.white, borderRadius: Radii.pill, paddingVertical: Spacing.md },
  contactBtnText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  faqTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text, marginTop: Spacing.md },
  faqItem: { backgroundColor: Colors.white, borderRadius: Radii.card, padding: Spacing.lg, ...Shadows.sm },
  faqQuestion: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  faqQuestionText: { flex: 1, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text, lineHeight: 22 },
  faqAnswer: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 22, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.surface },
});
