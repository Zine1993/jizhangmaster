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

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function EmotionTimeHeatmapCard({ data, rankType, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const grid = useMemo(() => {
    // 7(days) x 24(hours)
    const g = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const tx of data) {
      if (tx.type !== rankType) continue;
      const d = new Date(tx.date);
      const day = d.getDay();
      const hour = d.getHours();
      const val = 1; // 以笔数为主，金额后续可扩展权重
      g[day][hour] += val;
    }
    let max = 0;
    for (let i = 0; i < 7; i++) for (let h = 0; h < 24; h++) max = Math.max(max, g[i][h]);
    return { g, max };
  }, [data, rankType]);

  const empty = grid.max <= 0;

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {t('insight.emotion.timeTitle') || 'Emotion-time hotspots'}
      </Text>
      {empty ? (
        <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>
          {t('dataHint.thisMonthRequired') as string}
        </Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {Array.from({ length: 24 }).map((_, h) => (
              <Text key={h} style={{ width: 10, textAlign: 'center', fontSize: 9, color: colors.textSecondary }}>{h % 6 === 0 ? String(h) : ''}</Text>
            ))}
          </View>
          {Array.from({ length: 7 }).map((_, day) => (
            <View key={day} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ width: 22, fontSize: 10, color: colors.textSecondary }}>{DAYS[day]}</Text>
              {Array.from({ length: 24 }).map((_, h) => {
                const v = grid.g[day][h];
                const alpha = grid.max > 0 ? v / grid.max : 0;
                const bg = `rgba(124,58,237,${alpha})`;
                return <View key={h} style={{ width: 10, height: 10, marginRight: 1, borderRadius: 2, backgroundColor: alpha === 0 ? colors.inputBackground : bg }} />;
              })}
            </View>
          ))}
        </View>
      )}
      <View style={{ marginTop: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {t('insight.emotion.timeTip') || 'See when emotions correlate with higher spending'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, width: 300 },
  title: { fontSize: 16, fontWeight: '700' },
});