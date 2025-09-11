import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';

export default function EmotionInsightDetail() {
  const params = useLocalSearchParams<{ type?: string; rankType?: 'expense'|'income' }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { transactions } = useTransactions();
  const router = useRouter();

  const title = useMemo(() => {
    const p = String(params.type || '');
    const map: Record<string, string> = {
      distribution: t('insight.emotion.distributionTitle') as string || 'Emotion distribution',
      time: t('insight.emotion.timeTitle') as string || 'Emotion-time hotspots',
      amount: t('insight.emotion.amountTitle') as string || 'Amount by emotion',
      category: t('insight.emotion.categoryTitle') as string || 'Emotion-category affinity',
      income: t('insight.emotion.incomeTitle') as string || 'Income source and emotion',
    };
    return map[p] || 'Emotion insight';
  }, [params.type, t]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
      <Text style={{ marginTop: 8, color: colors.textSecondary }}>
        {t('insight.emotion.detailWip') || 'Detailed visualization coming soon. This page will show deeper analyses and filters.'}
      </Text>
    </ScrollView>
  );
}