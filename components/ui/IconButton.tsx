import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export interface IconButtonProps {
  size?: 28 | 32 | 36;
  variant?: 'default' | 'ghost' | 'destructive';
  style?: ViewStyle;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode; // 传入图标
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
}

export default function IconButton({
  size = 32,
  variant = 'ghost',
  style,
  disabled,
  onPress,
  children,
  hitSlop = { top: 8, bottom: 8, left: 8, right: 8 },
}: IconButtonProps) {
  const { colors } = useTheme();

  let bg = 'transparent';
  if (variant === 'default') bg = colors.text + '10';
  if (variant === 'destructive') bg = colors.expense + '15';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      hitSlop={hitSlop as any}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});