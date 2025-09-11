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
};

type Props = {
  data: Tx[];
  rankType: 'expense' | 'income';
  onPress?: () => void;
};

export default function EmotionCategoryAffinityCard({ data, rankType, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const rows = useMemo(() => {
    // emotion-category pair counts (expense侧重点)
    const map = new Map<string, number>();
    for (const tx of data) {
      if (tx.type !== rankType) continue;
      const em = (tx.emotion || '').trim() || 'Unknown';
      const cat = (tx.category || '').trim() || 'Other';
      const key = `${em}__${cat}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    const arr = Array.from(map.entries()).map(([k, v]) => {
      const [em, cat] = k.split('__');
      return { em, cat, count: v };
    });
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 6);
  }, [data, rankType]);

  const empty = rows.length === 0;

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {t('insight.emotion.categoryTitle') || 'Emotion-category affinity'}
      </Text>
      {empty ? (
        <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>
          {t('dataHint.thisMonthRequired') as string}
        </Text>
      ) : (
        <View style={{ marginTop: 8, gap: 6 }}>
          {rows.map((r) => (
            <View key={r.em} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>{r.em} → {r.cat}</Text>
              <Text style={{ color: colors.textSecondary }}>×{r.count}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>{t('insight.emotion.categoryTip') || 'Identify frequent emotion-category pairs'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, width: 300 },
  title: { fontSize: 16, fontWeight: '700' },
});