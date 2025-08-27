import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, DollarSign, ChartPie as PieChart } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import PieChartComponent from '@/components/PieChart';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';

export default function StatsScreen() {
  const { t } = useLanguage();
  const { transactions, getMonthlyStats, getCurrencySymbol } = useTransactions();
  const { colors } = useTheme();
  const { income, expense, balance } = getMonthlyStats();
  const currencySymbol = getCurrencySymbol();

  const categoryStats = transactions.reduce((stats, transaction) => {
    if (!stats[transaction.category]) {
      stats[transaction.category] = { income: 0, expense: 0, total: 0 };
    }
    if (transaction.type === 'income') {
      stats[transaction.category].income += transaction.amount;
    } else {
      stats[transaction.category].expense += transaction.amount;
    }
    stats[transaction.category].total += transaction.amount;
    return stats;
  }, {} as Record<string, { income: number; expense: number; total: number }>);

  const topCategories = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

  const pieChartColors = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const incomeChartData = Object.entries(categoryStats)
    .filter(([, stats]) => stats.income > 0)
    .map(([category, stats], index) => ({
      category,
      amount: stats.income,
      color: pieChartColors[index % pieChartColors.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  const expenseChartData = Object.entries(categoryStats)
    .filter(([, stats]) => stats.expense > 0)
    .map(([category, stats], index) => ({
      category,
      amount: stats.expense,
      color: pieChartColors[index % pieChartColors.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  const StatCard = ({
    title,
    value,
    icon,
    color,
    subtitle
  }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }) => (
    <View style={[styles.statCard, { borderColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          {icon}
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader variant="userInfo" />
      <Card padding={16}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('stats')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{t('statsSubtitle')}</Text>
      </Card>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Card padding={16}>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('balance')}
              value={`${currencySymbol}${balance.toFixed(2)}`}
              icon={<DollarSign size={24} color="#8B5CF6" />}
              color="#8B5CF6"
            />
            <StatCard
              title={t('income')}
              value={`${currencySymbol}${income.toFixed(2)}`}
              icon={<TrendingUp size={24} color={colors.income} />}
              color={colors.income}
            />
            <StatCard
              title={t('expense')}
              value={`${currencySymbol}${expense.toFixed(2)}`}
              icon={<TrendingDown size={24} color={colors.expense} />}
              color={colors.expense}
            />
          </View>
        </Card>

        {(incomeChartData.length > 0 || expenseChartData.length > 0) && (
          <Card padding={16}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('pieChart')}</Text>
            </View>

            {incomeChartData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, { color: colors.income }]}>{t('income')}</Text>
                <PieChartComponent data={incomeChartData} size={180} />
              </View>
            )}

            {expenseChartData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, { color: colors.expense }]}>{t('expense')}</Text>
                <PieChartComponent data={expenseChartData} size={180} />
              </View>
            )}
          </Card>
        )}

        {topCategories.length > 0 && (
          <Card padding={16}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('topCategories')}</Text>
            </View>

            {topCategories.map(([category, stats]) => (
              <View key={category} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{t(category)}</Text>
                  <Text style={[styles.categoryAmount, { color: colors.textSecondary }]}>{currencySymbol}{stats.total.toFixed(2)}</Text>
                </View>
                <View style={[styles.categoryBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${Math.min((stats.total / (income + expense || 1)) * 100, 100)}%`,
                        backgroundColor: (stats as any).expense > (stats as any).income ? colors.expense : colors.income,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    gap: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statInfo: { flex: 1 },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});