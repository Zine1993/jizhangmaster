import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export default function Section({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.section, style as any]}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    gap: 12,
  },
});