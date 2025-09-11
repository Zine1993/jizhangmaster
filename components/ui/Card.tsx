import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { CARD_MARGIN_H, CARD_MARGIN_TOP } from './constants/layout';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: number;
};

export default function Card({ children, style, padding = 16 }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          marginHorizontal: CARD_MARGIN_H,
          marginTop: CARD_MARGIN_TOP,
        },
        styles.card,
        {
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          padding,
        },
        style as any,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    // iOS shadow
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    // Android
    elevation: 3,
  },
});
