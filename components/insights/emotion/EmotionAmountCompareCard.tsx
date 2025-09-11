import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/i18n';

type Tx = {
  type: 'expense' | 'income';
  amount: number;
  emotion?: string | null;
  date: string | Date;
};

type Props = {
  data: Tx[];
  rankType: 'expense' | 'income';
  onPress?: () => void;
};

export default function EmotionAmountCompareCard({ data, rankType, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const bars = useMemo(() => {
    const sum = new Map<string, number>();
    const cnt = new Map<string, number>();
    for (const tx of data) {
      if (tx.type !== rankType) continue;
      const em = (tx.emotion || '').trim() || 'Unknown';
      const v = Math.abs(tx.amount || 0);
      sum.set(em, (sum.get(em) || 0) + v);
      cnt.set(em, (cnt.get(em) || 0) + 1);
    }
    const arr = Array.from(sum.entries()).map(([em, s]) => ({ emotion: em, avg: (cnt.get(em) || 1) === 0 ? 0 : s / (cnt.get(em) || 1) }));
    const max = arr.reduce((m, it) => Math.max(m, it.avg), 0);
    arr.sort((a, b) => b.avg - a.avg);
    return { arr: arr.slice(0, 6), max };
  }, [data, rankType]);

  const empty = !bars.arr.length || bars.max <= 0;

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {t('insight.emotion.amountTitle') || 'Amount by emotion'}
      </Text>
      {empty ? (
        <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>
          {t('dataHint.thisMonthRequired') as string}
        </Text>
      ) : (
        <View style={{ marginTop: 8, gap: 8 }}>
          {bars.arr.map((b) => {
            const w = bars.max > 0 ? Math.max(4, (b.avg / bars.max) * 220) : 4;
            return (
              <View key={b.emotion} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ width: 64, color: colors.text }} numberOfLines={1}>{b.emotion}</Text>
                <View style={{ height: 10, width: w, backgroundColor: '#7C3AED', borderRadius: 6 }} />
                <Text style={{ marginLeft: 8, color: colors.textSecondary }}>{formatNumber(b.avg)}</Text>
              </View>
            );
          })}
        </View>
      )}
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>{t('insight.emotion.amountTip') || 'Compare average amount under different emotions'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, width: 300 },
  title: { fontSize: 16, fontWeight: '700' },
});