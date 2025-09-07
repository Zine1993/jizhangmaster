import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export type ChipSize = 'sm' | 'md';

export interface ChipProps {
  label?: string;
  icon?: React.ReactNode;
  selected?: boolean; // selected -> primary soft bg + primary text
  size?: ChipSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode; // if provided, label 将被忽略
}

const sizeTokens = {
  sm: { pv: 6, ph: 10, font: 14, icon: 16 },
  md: { pv: 8, ph: 12, font: 15, icon: 18 },
};

export default function Chip(props: ChipProps) {
  const { colors } = useTheme();
  const {
    label,
    icon,
    selected = true,
    size = 'sm',
    style,
    textStyle,
    disabled,
    onPress,
    children,
  } = props;

  const t = sizeTokens[size];
  const bg = selected ? colors.primary + '20' : 'transparent';
  const fg = selected ? colors.primary : colors.textSecondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          paddingVertical: t.pv,
          paddingHorizontal: t.ph,
          backgroundColor: bg,
          borderRadius: 999,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <View>{icon}</View> : null}
        {children ? (
          <View style={{ marginLeft: icon ? 6 : 0 }}>{children}</View>
        ) : (
          label ? (
            <Text
              style={[
                { color: fg, fontSize: t.font, fontWeight: '600', marginLeft: icon ? 6 : 0 },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ) : null
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});