import React from 'react';
import { View, Text } from 'react-native';

export default function DataHint({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <View style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' }}>
      <Text style={{ color: '#6b7280', fontSize: 12 }}>{text}</Text>
    </View>
  );
}