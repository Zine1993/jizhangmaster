import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function Input(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      {...props}
      style={[
        styles.input,
        { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
        props.style as any,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});