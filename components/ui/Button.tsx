import React from 'react';
import { TouchableOpacity, ActivityIndicator, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label?: string;
  icon?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onPress?: () => void;
  children?: React.ReactNode; // 自定义内容优先
}

const sizeTokens = {
  sm: { pv: 6, ph: 10, font: 14, icon: 16 },
  md: { pv: 8, ph: 12, font: 16, icon: 18 },
  lg: { pv: 10, ph: 14, font: 17, icon: 20 },
};

export default function Button({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  textStyle,
  onPress,
  children,
}: ButtonProps) {
  const { colors } = useTheme();
  const t = sizeTokens[size];

  const isDisabled = disabled || loading;

  let bg = 'transparent';
  let fg = colors.text;
  let borderColor = colors.border;

  if (variant === 'primary') {
    bg = colors.primary;
    fg = '#fff';
    borderColor = 'transparent';
  } else if (variant === 'outline') {
    bg = 'transparent';
    fg = colors.text;
    borderColor = colors.border;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    fg = colors.primary;
    borderColor = 'transparent';
  } else if (variant === 'destructive') {
    bg = colors.expense;
    fg = '#fff';
    borderColor = 'transparent';
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          paddingVertical: t.pv,
          paddingHorizontal: t.ph,
          backgroundColor: bg,
          borderRadius: 8,
          borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth : 0,
          borderColor,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {children ? (
        children
      ) : (
        <>
          {loading ? (
            <ActivityIndicator color={fg} />
          ) : (
            <>
              {icon}
              {label ? (
                <Text
                  style={[
                    { color: fg, fontSize: t.font, fontWeight: '600', marginLeft: icon ? 6 : 0 },
                    textStyle,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  allowFontScaling
                  ellipsizeMode="tail"
                >
                  {label}
                </Text>
              ) : null}
            </>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});