import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import formatCurrency from '@/lib/formatCurrency';
import AmountText from '@/components/ui/AmountText';

type DebtItem = { name: string; amount: number }; // 总负债本金或近一期账单总额
type Props = {
  monthlyIncome: number;
  debts: DebtItem[];
};
type DebtProps = Props & { hint?: string };

export default function DebtRiskCard({ monthlyIncome, debts, hint }: DebtProps) {
  const { t } = useLanguage();
  const { currency } = useTransactions();
  const { colors } = useTheme();

  const totalDebt = debts.reduce((s, d) => s + Math.max(0, d.amount || 0), 0);
  const hasData = monthlyIncome > 0 || totalDebt > 0;
  const ratio = hasData ? (monthlyIncome > 0 ? totalDebt / monthlyIncome : 1) : 0;
  const level =
    ratio <= 0.3 ? 'safe' : ratio <= 0.6 ? 'warn' : 'danger';
  const levelText =
    level === 'safe' ? t('insight.health.debt.safe') :
    level === 'warn' ? t('insight.health.debt.warn') :
    t('insight.health.debt.danger');

  const advice =
    level === 'safe' ? t('insight.health.debt.advice.safe') :
    level === 'warn' ? t('insight.health.debt.advice.warn') :
    t('insight.health.debt.advice.danger');

  // 简化堆叠条
  const max = Math.max(hasData ? totalDebt : 0, hasData ? monthlyIncome : 0, 1);
  const incW = Math.round(((hasData ? monthlyIncome : 0) / max) * 220);
  const debtW = Math.round(((hasData ? totalDebt : 0) / max) * 220);

  const colorLevel = level === 'danger' ? colors.expense : level === 'warn' ? '#F59E0B' : colors.income;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{t('insight.health.debt.title')}</Text>
      {!!hint && (
        <View style={{ marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: colors.primary + '15' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{hint}</Text>
        </View>
      )}
      <View style={{ gap: 6, marginTop: 6 }}>
        <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ width: incW, height: '100%', backgroundColor: colors.income }} />
        </View>
        <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ width: debtW, height: '100%', backgroundColor: colors.expense }} />
        </View>
      </View>
      <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>{t('income')}: </Text>
          <AmountText
            value={hasData ? formatCurrency(monthlyIncome, currency) : '—'}
            color={colors.textSecondary}
            style={{}}
            align="left"
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>{t('debt')}: </Text>
          <AmountText
            value={hasData ? formatCurrency(totalDebt, currency) : '—'}
            color={colors.textSecondary}
            style={{}}
            align="left"
          />
        </View>
      </View>

      <View style={{ marginTop: 10, padding: 8, borderRadius: 8, backgroundColor: colorLevel + '22' }}>
        <Text style={{ color: colorLevel, fontWeight: '700' }}>{t('insight.health.debt.ratio')}: {hasData ? `${(ratio*100).toFixed(0)}% · ${levelText}` : '—'}</Text>
      </View>

      {hasData && debts.length > 0 && (
        <View style={{ marginTop: 8, gap: 4 }}>
          {debts.slice(0, 3).map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }} numberOfLines={1}>• {d.name}: </Text>
              <AmountText
                value={formatCurrency(d.amount, currency)}
                color={colors.textSecondary}
                style={{}}
                align="left"
              />
            </View>
          ))}
        </View>
      )}

      <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>{advice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 280, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  title: { fontSize: 16, fontWeight: '700' },
});