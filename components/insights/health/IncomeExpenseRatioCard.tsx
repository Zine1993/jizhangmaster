import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency } from '@/lib/i18n';
import AmountText from '@/components/ui/AmountText';

type MonthAgg = { income: number; expense: number; currency: string };
type RatioProps = { agg: MonthAgg; hint?: string };

export default function IncomeExpenseRatioCard({ agg, hint }: RatioProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const income = Math.max(0, agg.income || 0);
  const expense = Math.max(0, agg.expense || 0);
  const ratio = expense > 0 ? income / expense : (income > 0 ? 3 : 0); // 避免除0
  const grade =
    ratio >= 2 ? t('insight.health.ratio.excellent') :
    ratio >= 1.5 ? t('insight.health.ratio.good') :
    ratio >= 1 ? t('insight.health.ratio.pass') :
    t('insight.health.ratio.poor');

  const advice =
    ratio >= 2 ? t('insight.health.ratio.advice.keep') :
    ratio >= 1.5 ? t('insight.health.ratio.advice.savingGoal') :
    ratio >= 1 ? t('insight.health.ratio.advice.reduceExpense') :
    t('insight.health.ratio.advice.raiseIncome');

  // 简化双柱图
  const maxVal = Math.max(income, expense, 1);
  const hIncome = Math.round((income / maxVal) * 72);
  const hExpense = Math.round((expense / maxVal) * 72);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{t('insight.health.ratio.title')}</Text>
      {!!hint && (
        <View style={{ marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: colors.primary + '15' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{hint}</Text>
        </View>
      )}
      <View style={styles.chartRow}>
        <View style={styles.barWrap}>
          <View style={[styles.bar, { height: hIncome, backgroundColor: colors.income }]} />
          <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>{t('income')}</Text>
          <AmountText
            value={formatCurrency(income, agg.currency as any)}
            color={colors.text}
            style={{ fontWeight: '700' }}
            align="center"
          />
        </View>
        <View style={styles.barWrap}>
          <View style={[styles.bar, { height: hExpense, backgroundColor: colors.expense }]} />
          <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>{t('expense')}</Text>
          <AmountText
            value={formatCurrency(expense, agg.currency as any)}
            color={colors.text}
            style={{ fontWeight: '700' }}
            align="center"
          />
        </View>
        <View style={styles.badge}>
          <Text style={{ color: colors.textSecondary }}>{t('insight.health.ratio.ratio')}</Text>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{(ratio).toFixed(2)}×</Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{grade}</Text>
        </View>
      </View>
      <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>{advice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 280, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  barWrap: { width: 72, alignItems: 'center' },
  bar: { width: 28, borderRadius: 6 },
  barLabel: { marginTop: 6, fontSize: 12 },
  badge: { marginLeft: 'auto', alignItems: 'flex-end' },
});