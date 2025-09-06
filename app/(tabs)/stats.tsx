import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartPie as PieChart, Settings } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import PieChartComponent from '@/components/PieChart';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';


export default function StatsScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { transactions, getCurrencySymbol } = useTransactions();
  const { colors } = useTheme();

  const [rangeLabel, setRangeLabel] = React.useState<string>('');
  const [activePreset, setActivePreset] = React.useState<'last7'|'thisMonth'|'lastMonth'|'thisYear'|null>('last7');
  // metric removed: fixed to amount
  const [startDate, setStartDate] = React.useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 6); return d; });
  const [endDate, setEndDate] = React.useState<Date>(new Date());
  const [showRangePicker, setShowRangePicker] = React.useState(false);

  const currencySymbol = getCurrencySymbol();
  React.useEffect(() => {
    setRangeLabel(t('last7Days'));
    setActivePreset('last7');
  }, []);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const appStartDate = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return new Date();
    const minTs = Math.min(...transactions.map(t => new Date(t.date).getTime()));
    const d = new Date(minTs);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [transactions]);
  const now = new Date();

  React.useEffect(() => {
    if (startDate < appStartDate) setStartDate(appStartDate);
    if (endDate < appStartDate) setEndDate(appStartDate);
  }, [appStartDate]);
  const range = React.useMemo(() => {
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const a = startDate || now;
    const b = endDate || now;
    const s = a <= b ? a : b;
    const e = a <= b ? b : a;
    return { start: startOfDay(s), end: endOfDay(e) };
  }, [now, startDate, endDate]);

  const filtered = React.useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= range.start && d <= range.end;
    });
  }, [transactions, range]);

  const pieChartColors = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const categoryAgg = React.useMemo(() => {
    const agg: Record<string, { incomeAmount: number; expenseAmount: number; incomeCount: number; expenseCount: number }> = {};
    // 1) 普通交易（排除转账本金/transfer 类别）
    filtered
      .filter(t => !(t as any).isTransfer && t.category !== 'transfer')
      .forEach(t => {
        const k = t.category || 'Other';
        if (!agg[k]) agg[k] = { incomeAmount: 0, expenseAmount: 0, incomeCount: 0, expenseCount: 0 };
        if (t.type === 'income') {
          agg[k].incomeAmount += t.amount;
          agg[k].incomeCount += 1;
        } else {
          agg[k].expenseAmount += t.amount;
          agg[k].expenseCount += 1;
        }
      });
    // 2) 转账手续费：同组支出减收入的差额计入“transfer”类别的支出
    const groups = new Map<string, { in?: number; out?: number }>();
    filtered
      .filter(t => (t as any).isTransfer)
      .forEach(t => {
        const gid = (t as any).transferGroupId || '';
        if (!gid) return;
        const g = groups.get(gid) || {};
        if (t.type === 'income') g.in = (g.in ?? 0) + t.amount;
        else g.out = (g.out ?? 0) + t.amount;
        groups.set(gid, g);
      });
    groups.forEach(g => {
      const fee = Math.max(0, (g.out ?? 0) - (g.in ?? 0));
      if (fee > 0) {
        const k = 'transfer';
        if (!agg[k]) agg[k] = { incomeAmount: 0, expenseAmount: 0, incomeCount: 0, expenseCount: 0 };
        agg[k].expenseAmount += fee;
        agg[k].expenseCount += 1;
      }
    });
    return agg;
  }, [filtered]);

  const sorter = (a: { amount: number; count: number }, b: { amount: number; count: number }) => b.amount - a.amount;

  const incomeTop = React.useMemo(() => {
    return Object.entries(categoryAgg)
      .map(([category, v]) => ({ category, amount: v.incomeAmount, count: v.incomeCount }))
      .filter(x => x.amount > 0 || x.count > 0)
      .sort(sorter)
      .slice(0, 5);
  }, [categoryAgg]);

  const expenseTop = React.useMemo(() => {
    return Object.entries(categoryAgg)
      .map(([category, v]) => ({ category, amount: v.expenseAmount, count: v.expenseCount }))
      .filter(x => x.amount > 0 || x.count > 0)
      .sort(sorter)
      .slice(0, 5);
  }, [categoryAgg]);

  const incomeChartData = incomeTop.map((x, index) => ({
    category: x.category,
    amount: x.amount,
    color: pieChartColors[index % pieChartColors.length],
  }));

  const expenseChartData = expenseTop.map((x, index) => ({
    category: x.category,
    amount: x.amount,
    color: pieChartColors[index % pieChartColors.length],
  }));

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
    <View style={[styles.statCard, { borderColor: color }]} >
      <View style={styles.statHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]} >
          {icon}
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]} > { value } </Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} >
      <GradientHeader
        variant="emojiTicker"
        right={
          <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: 8 }}>
            <Settings size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      <Card padding={16}>
        <Text style={[styles.pageTitle, { color: colors.text }]} > { t('stats') } </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }} > { t('statsSubtitle') } </Text>
      </Card>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 95 }}>
        <Card padding={16}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} > { t('timeRange') } </Text>
          </View>
          <View style={[styles.filterRow, { justifyContent: 'space-between' }]} >
            <Text style={[styles.chipText, { color: colors.textSecondary }]} >
              {rangeLabel || t('last7Days')}
            </Text>
            <Pressable
              onPress={() => setShowRangePicker(true)}
              style={[styles.chip, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            >
              <Text style={[styles.chipText, { color: colors.text }]} > { `${formatDate(startDate)} ~ ${formatDate(endDate)}` } </Text>
              <Text style={[styles.chipText, { color: colors.text }]} > {'▾'} </Text>
            </Pressable>
          </View>
          {/* 快速预设区间 */}
          <View style={[styles.filterRow, { marginTop: 8, flexWrap: 'wrap', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 2 }]} >
            <Pressable
              onPress={() => {
                const now = new Date();
                const s = new Date(now); s.setDate(s.getDate() - 6);
                setStartDate(s);
                setEndDate(now);
                const lbl = t('last7Days') || '近7天';
                setRangeLabel(lbl);
                setActivePreset('last7');
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: activePreset === 'last7' ? colors.primary + '20' : 'transparent' }}
            >
              <Text style={{ color: activePreset === 'last7' ? colors.primary : colors.textSecondary }}>{t('last7Days') || '近7天'}</Text>
            </Pressable>



            <Pressable
              onPress={() => {
                const now = new Date();
                const s = new Date(now.getFullYear(), now.getMonth(), 1);
                const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                setStartDate(s);
                setEndDate(e);
                const lbl = t('thisMonth') || '本月';
                setRangeLabel(lbl);
                setActivePreset('thisMonth');
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: activePreset === 'thisMonth' ? colors.primary + '20' : 'transparent' }}
            >
              <Text style={{ color: activePreset === 'thisMonth' ? colors.primary : colors.textSecondary }}>{t('thisMonth') || '本月'}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const now = new Date();
                const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const e = new Date(now.getFullYear(), now.getMonth(), 0);
                setStartDate(s);
                setEndDate(e);
                const lbl = t('lastMonth') || '上月';
                setRangeLabel(lbl);
                setActivePreset('lastMonth');
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: activePreset === 'lastMonth' ? colors.primary + '20' : 'transparent' }}
            >
              <Text style={{ color: activePreset === 'lastMonth' ? colors.primary : colors.textSecondary }}>{t('lastMonth') || '上月'}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const now = new Date();
                const s = new Date(now.getFullYear(), 0, 1);
                const e = now;
                setStartDate(s);
                setEndDate(e);
                const lbl = t('thisYear') || '今年';
                setRangeLabel(lbl);
                setActivePreset('thisYear');
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: activePreset === 'thisYear' ? colors.primary + '20' : 'transparent' }}
            >
              <Text style={{ color: activePreset === 'thisYear' ? colors.primary : colors.textSecondary }}>{t('thisYear') || '今年'}</Text>
            </Pressable>
          </View>



          <>
            <DateRangePicker
              visible={showRangePicker}
              onClose={() => setShowRangePicker(false)}
              initialStartDate={startDate}
              initialEndDate={endDate}
              minDate={appStartDate}
              onApply={({ start, end, label }: any) => {
                setStartDate(start);
                setEndDate(end);
                const lbl = label || `${formatDate(start)} ~ ${formatDate(end)}`;
                setRangeLabel(lbl);
                setActivePreset(null);
                setShowRangePicker(false);
              }}
            />
          </>
        </Card>

        {(incomeChartData.length > 0 || expenseChartData.length > 0) && (
          <Card padding={16}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]} > { t('pieChart') } </Text>
            </View>

            {incomeChartData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, { color: colors.income }]} > { t('income') } </Text>
                <PieChartComponent data={incomeChartData} size={180} />
              </View>
            )}

            {expenseChartData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, { color: colors.expense }]} > { t('expense') } </Text>
                <PieChartComponent data={expenseChartData} size={180} />
              </View>
            )}
          </Card>
        )}

        {incomeTop.length > 0 && (
          <Card padding={16}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]} > { t('incomeTopCategories') } </Text>
            </View>
            {incomeTop.map(item => (
              <View key={item.category} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]} > { t(item.category) } </Text>
                  <Text style={[styles.categoryAmount, { color: colors.textSecondary }]} >
                    {`${currencySymbol}${item.amount.toFixed(2)}`}
                  </Text>
                </View>
                <View style={[styles.categoryBar, { backgroundColor: colors.border }]} >
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${Math.min(100, (item.amount / (incomeTop.reduce((s, x) => s + x.amount, 0) || 1)) * 100)}%`,
                        backgroundColor: colors.income,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}

        {expenseTop.length > 0 && (
          <Card padding={16}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]} > { t('expenseTopCategories') } </Text>
            </View>
            {expenseTop.map(item => (
              <View key={item.category} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]} > { t(item.category) } </Text>
                  <Text style={[styles.categoryAmount, { color: colors.textSecondary }]} >
                    {`${currencySymbol}${item.amount.toFixed(2)}`}
                  </Text>
                </View>
                <View style={[styles.categoryBar, { backgroundColor: colors.border }]} >
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${Math.min(100, (item.amount / (expenseTop.reduce((s, x) => s + x.amount, 0) || 1)) * 100)}%`,
                        backgroundColor: colors.expense,
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});