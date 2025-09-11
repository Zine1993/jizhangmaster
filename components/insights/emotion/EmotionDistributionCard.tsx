import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PieChartMini, { ChartPoint } from '../PieChartMini';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Tx = {
  type: 'expense' | 'income';
  amount: number;
  emotion?: string | null;
  category?: string | null;
  accountId?: string | null;
  date: string | Date;
};

type Props = {
  data: Tx[];
  rankType: 'expense' | 'income';
  metric: 'count' | 'amount';
  onPress?: () => void;
};

const EMOTION_COLORS = [
  '#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#14B8A6',
];

export default function EmotionDistributionCard({ data, rankType, metric, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const { chart, total } = useMemo(() => {
    const map = new Map<string, number>();
    let currencyGuess = '';
    for (const tx of data) {
      if (tx.type !== rankType) continue;
      const em = (tx.emotion || '').trim() || 'Unknown';
      const inc = metric === 'count' ? 1 : Math.abs(tx.amount || 0);
      map.set(em, (map.get(em) || 0) + inc);
      // 猜测币种（若数据里带 currency，可在 Tx 类型中扩展并读取）
      if (!currencyGuess) currencyGuess = (tx as any).currency || '';
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const chart: ChartPoint[] = entries.slice(0, 6).map(([label, value], idx) => ({
      label,
      value,
      color: EMOTION_COLORS[idx % EMOTION_COLORS.length],
      currency: currencyGuess || '',
      type: rankType,
    }));
    return { chart, total };
  }, [data, rankType, metric]);

  const empty = !chart.length || total <= 0;

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {t('insight.emotion.distributionTitle') || 'Emotion distribution'}
      </Text>
      {empty ? (
        <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>
          {t('dataHint.thisMonthRequired') as string}
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
          <PieChartMini data={chart} radius={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {chart.map((c) => (
              <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color, marginRight: 8 }} />
                <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                  {c.label}
                </Text>
                <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>
                  {metric === 'count' ? Math.round(c.value) : Math.round(c.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
        <Badge text={metric === 'count' ? (t('insight.emotion.byCount') as string || 'By count') : (t('insight.emotion.byAmount') as string || 'By amount')} colors={colors} />
        <Badge text={rankType === 'expense' ? (t('expense') as string) : (t('income') as string)} colors={colors} />
      </View>
    </Pressable>
  );
}

function Badge({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.inputBackground, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, width: 300 },
  title: { fontSize: 16, fontWeight: '700' },
});