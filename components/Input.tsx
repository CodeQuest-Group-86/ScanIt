import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  isPassword = false,
  ...props
}: InputProps) {
  const [secureEntry, setSecureEntry] = useState(isPassword);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, error ? styles.inputError : styles.inputNormal]}>
        {leftIcon ? (
          <Ionicons name={leftIcon} size={20} color={Colors.textSecondary} style={styles.leftIcon} />
        ) : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureEntry}
          autoCapitalize={isPassword ? 'none' : props.autoCapitalize}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setSecureEntry(v => !v)} style={styles.rightIcon}>
            <Ionicons name={secureEntry ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text, marginBottom: 2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    ...Shadows.sm,
  },
  inputNormal: { borderColor: Colors.border },
  inputError: { borderColor: Colors.danger, backgroundColor: Colors.danger + '08' },
  leftIcon: { marginRight: Spacing.sm },
  rightIcon: { padding: Spacing.xs },
  input: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  error: { fontSize: Typography.sizes.xs, color: Colors.danger, marginTop: 4, marginLeft: 4 },
});
