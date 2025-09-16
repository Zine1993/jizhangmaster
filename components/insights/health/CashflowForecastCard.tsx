import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactions } from '@/contexts/TransactionContext';

type SeriesPoint = { label: string; value: number };
type Props = {
  history: SeriesPoint[]; // 最近3-6个月净流入
};
type FlowProps = Props & { hint?: string };

export default function CashflowForecastCard({ history, hint }: FlowProps) {
  const { t } = useLanguage();
  const { currency } = useTransactions();
  const { colors } = useTheme();

  // 简单移动平均预测未来3期
  const vals = history.map(p => p.value);
  const hasData = vals.some(v => Math.abs(v) > 0);
  const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  const sigma = vals.length ? Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length) : 0;

  const forecast = [1,2,3].map((i) => ({
    label: String(t('insight.health.flow.monthN', { n: String(i) })),
    value: avg,
  }));
  const minBand = forecast.map(p => p.value - sigma);
  const maxBand = forecast.map(p => p.value + sigma);

  const all = [...vals, ...forecast.map(f => f.value), ...minBand, ...maxBand];
  const maxAbs = Math.max(1, ...all.map(v => Math.abs(v)));

  // 简化图：用条形表示历史，用虚线小条表示预测；负值红，正值绿；置信区间用半透明背景
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{t('insight.health.flow.title')}</Text>
      {!!hint && (
        <View style={{ marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: colors.primary + '15' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{hint}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
        {history.map((p, i) => {
          const h = Math.max(2, Math.round((Math.abs(p.value) / maxAbs) * 72));
          const color = p.value >= 0 ? colors.income : colors.expense;
          return (
            <View key={i} style={{ width: 14, height: 80, justifyContent: 'flex-end', alignItems: 'center' }}>
              <View style={{ width: 12, height: hasData ? h : 2, backgroundColor: hasData ? color : colors.border, borderRadius: 4 }} />
            </View>
          );
        })}
        {forecast.map((p, i) => {
          const h = Math.max(2, Math.round((Math.abs(p.value) / maxAbs) * 72));
          const risky = p.value < 0;
          return (
            <View key={'f'+i} style={{ width: 14, height: 80, justifyContent: 'flex-end', alignItems: 'center' }}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, width: 12, backgroundColor: hasData ? (risky ? colors.expense : colors.income) + '20' : colors.border, borderRadius: 4 }} />
              <View style={{ width: 12, height: hasData ? h : 2, borderRadius: 4, borderWidth: hasData ? 2 : 0, borderColor: risky ? colors.expense : colors.income }} />
            </View>
          );
        })}
      </View>
      <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>
        {hasData
          ? (forecast.some(f => f.value < 0)
            ? t('insight.health.flow.advice.risk')
            : t('insight.health.flow.advice.ok'))
          : '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 280, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  title: { fontSize: 16, fontWeight: '700' },
});