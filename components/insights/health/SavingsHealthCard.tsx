import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import AmountText from '@/components/ui/AmountText';
import { useTransactions } from '@/contexts/TransactionContext';
import formatCurrency from '@/lib/formatCurrency';

type Props = {
  liquidSavings: number; // 可动用储蓄
  monthlyExpenseAvg: number;
};
type SavingProps = Props & { hint?: string };

export default function SavingsHealthCard({ liquidSavings, monthlyExpenseAvg, hint }: SavingProps) {
  const { t } = useLanguage();
  const { currency } = useTransactions();
  const { colors } = useTheme();

  const months = monthlyExpenseAvg > 0 ? liquidSavings / monthlyExpenseAvg : 0;
  const target = months >= 6 ? 6 : 3; // 简化阈值显示
  const pct = Math.max(0, Math.min(1, months / target));

  const advice =
    months >= 6 ? t('insight.health.saving.advice.strong') :
    months >= 3 ? t('insight.health.saving.advice.keep') :
    t('insight.health.saving.advice.increase');

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{t('insight.health.saving.title')}</Text>
      {!!hint && (
        <View style={{ marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: colors.primary + '15' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{hint}</Text>
        </View>
      )}
      <View style={{ height: 12, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden', marginTop: 8 }}>
        <View style={{ width: `${Math.round(pct*100)}%`, height: '100%', backgroundColor: colors.primary }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <Text style={{ color: colors.textSecondary }}>
          {t('insight.health.saving.months', { n: months.toFixed(1) })}
        </Text>
        <AmountText
          value={formatCurrency(liquidSavings, currency)}
          color={colors.textSecondary}
          style={{}}
          align="right"
        />
      </View>
      <Text style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>{advice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 280, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  title: { fontSize: 16, fontWeight: '700' },
});