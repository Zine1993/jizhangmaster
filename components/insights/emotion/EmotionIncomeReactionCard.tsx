import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Tx = {
  type: 'expense' | 'income';
  amount: number;
  emotion?: string | null;
  category?: string | null;
  date: string | Date;
  source?: string | null; // 收入来源，如 salary/investment/bonus
};

type Props = {
  data: Tx[];
  onPress?: () => void;
};

export default function EmotionIncomeReactionCard({ data, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const rows = useMemo(() => {
    // income only: group by source x emotion (count)
    const map = new Map<string, number>();
    for (const tx of data) {
      if (tx.type !== 'income') continue;
      const src = (tx.source || tx.category || 'Other').trim();
      const em = (tx.emotion || '').trim() || 'Unknown';
      const key = `${src}__${em}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    const arr = Array.from(map.entries()).map(([k, v]) => {
      const [src, em] = k.split('__');
      return { src, em, count: v };
    });
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 6);
  }, [data]);

  const empty = rows.length === 0;

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {t('insight.emotion.incomeTitle') || 'Income source and emotion'}
      </Text>
      {empty ? (
        <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>
          {t('dataHint.thisMonthRequired') as string}
        </Text>
      ) : (
        <View style={{ marginTop: 8, gap: 6 }}>
          {rows.map((r, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>{r.src} → {r.em}</Text>
              <Text style={{ color: colors.textSecondary }}>×{r.count}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>{t('insight.emotion.incomeTip') || 'See emotions when income arrives'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, width: 300 },
  title: { fontSize: 16, fontWeight: '700' },
});