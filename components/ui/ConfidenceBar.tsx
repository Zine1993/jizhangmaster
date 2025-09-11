import React from 'react';
import { View } from 'react-native';

export default function ConfidenceBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value || 0));
  const color = v > 0.6 ? '#22c55e' : v > 0.3 ? '#f59e0b' : '#ef4444';
  return (
    <View style={{ width: 60, height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(v * 100)}%`, height: 6, backgroundColor: color }} />
    </View>
  );
}