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
import { ChartPie as PieChart, Settings, Calendar, Coins, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import PieChartComponent from '@/components/PieChart';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import IconButton from '@/components/ui/IconButton';
import formatCurrency from '@/lib/formatCurrency';
import { displayNameFor } from '@/lib/i18n';



export default function StatsScreen() {
  // 所有 hooks 顶部按固定顺序执行，避免条件或早退
  const { t, language } = useLanguage();
  const router = useRouter();
  const { transactions, currency } = useTransactions();
  const { colors } = useTheme();

  // 悬浮气泡选中组：必须在组件顶层声明，避免 Hooks 顺序错误
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  const [rangeLabel, setRangeLabel] = React.useState<string>('');
  const [activePreset, setActivePreset] = React.useState<'last7'|'thisMonth'|'lastMonth'|'thisYear'|null>('last7');
  const [startDate, setStartDate] = React.useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 6); return d; });
  const [endDate, setEndDate] = React.useState<Date>(new Date());
  const [showRangePicker, setShowRangePicker] = React.useState(false);






  // currencySymbol removed; using formatCurrency
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
          <IconButton onPress={() => router.push('/settings')} size={32}>
            <Settings size={24} color="#fff" />
          </IconButton>
        }
      />
      <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Text style={[styles.pageTitle, { color: colors.text }]} > { t('stats') } </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }} > { t('statsSubtitle') } </Text>
      </Card>





      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 95 }}>
        <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('timeRange') || 'Time Range'}</Text>
          </View>
          <View style={[styles.filterRow, { justifyContent: 'space-between' }]} >
            <Text style={[styles.chipText, { color: colors.textSecondary }]} >
              {rangeLabel || t('last7Days')}
            </Text>
            <Pressable
              onPress={() => setShowRangePicker(true)}
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  maxWidth: Math.round(require('react-native').Dimensions.get('window').width * 0.42),
                }
              ]}
            >
              <Text
                style={[styles.chipText, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                allowFontScaling
              >
                { `${formatDate(startDate)} ~ ${formatDate(endDate)}` }
              </Text>
              <Text style={[styles.chipText, { color: colors.text }]} > {'▾'} </Text>
            </Pressable>
          </View>
          {/* 快速预设区间 */}
          <View style={[styles.filterRow, { marginTop: 8, flexWrap: 'nowrap', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 2, justifyContent: 'space-around' }]} >
            <Chip
              label={t('last7Days') as string}
              selected={activePreset === 'last7'}
              onPress={() => {
                const now = new Date();
                const s = new Date(now); s.setDate(s.getDate() - 6);
                setStartDate(s);
                setEndDate(now);
                const lbl = t('last7Days') as string;
                setRangeLabel(lbl);
                setActivePreset('last7');
              }}
            />



            <Chip
              label={t('thisMonth') as string}
              selected={activePreset === 'thisMonth'}
              onPress={() => {
                const now = new Date();
                const s = new Date(now.getFullYear(), now.getMonth(), 1);
                const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                setStartDate(s);
                setEndDate(e);
                const lbl = t('thisMonth') as string;
                setRangeLabel(lbl);
                setActivePreset('thisMonth');
              }}
            />

            <Chip
              label={t('lastMonth') as string}
              selected={activePreset === 'lastMonth'}
              onPress={() => {
                const now = new Date();
                const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const e = new Date(now.getFullYear(), now.getMonth(), 0);
                setStartDate(s);
                setEndDate(e);
                const lbl = t('lastMonth') as string;
                setRangeLabel(lbl);
                setActivePreset('lastMonth');
              }}
            />

            <Chip
              label={t('thisYear') as string}
              selected={activePreset === 'thisYear'}
              onPress={() => {
                const now = new Date();
                const s = new Date(now.getFullYear(), 0, 1);
                const e = now;
                setStartDate(s);
                setEndDate(e);
                const lbl = t('thisYear') as string;
                setRangeLabel(lbl);
                setActivePreset('thisYear');
              }}
            />
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

        {/* 时间段总额（按币种横向滑动） */}
        {filtered.length > 0 && (
          <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={styles.sectionHeader}>
              <Coins size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('periodOverview')}</Text>
            </View>
            {(() => {
              // 按币种聚合（普通收支 + 转账手续费；排除转账本金）
              const groups = new Map<string, { income: number; expense: number }>();
              const ensure = (c: string) => {
                if (!groups.has(c)) groups.set(c, { income: 0, expense: 0 });
                return groups.get(c)!;
              };

              // 普通收支
              filtered
                .filter(t => !(t as any).isTransfer && t.category !== 'transfer')
                .forEach(t => {
                  const cur = ((t as any).currency || currency) as string;
                  const g = ensure(cur);
                  if (t.type === 'income') g.income += t.amount;
                  else g.expense += t.amount;
                });

              // 转账手续费：同组支出-收入计入支出，按支出侧币种
              const tf = filtered.filter(t => (t as any).isTransfer);
              const mapByGid = new Map<string, { in?: typeof filtered[0]; out?: typeof filtered[0] }>();
              tf.forEach(t => {
                const gid = (t as any).transferGroupId || '';
                if (!gid) return;
                const g = mapByGid.get(gid) || {};
                if (t.type === 'income') g.in = t; else g.out = t;
                mapByGid.set(gid, g);
              });
              mapByGid.forEach(({ in: ti, out: to }) => {
                const outAmt = to?.amount ?? 0;
                const inAmt = ti?.amount ?? 0;
                const fee = Math.max(0, outAmt - inAmt);
                if (fee > 0 && to) {
                  const cur = ((to as any).currency || currency) as string;
                  const g = ensure(cur);
                  g.expense += fee;
                }
              });

              // 维持“添加顺序”：以首次出现顺序排序（按 transactions 中该币种第一次出现的索引）
              const firstIndexByCur = new Map<string, number>();
              transactions.forEach((tx, idx) => {
                const c = ((tx as any).currency || currency) as string;
                if (!firstIndexByCur.has(c)) firstIndexByCur.set(c, idx);
              });
              const items = Array.from(groups.entries())
                .map(([cur, v]) => ({
                  cur,
                  income: v.income,
                  expense: v.expense,
                  balance: v.income - v.expense,
                  _order: firstIndexByCur.get(cur) ?? Number.MAX_SAFE_INTEGER,
                }))
                .sort((a, b) => a._order - b._order);

              if (!items.length) {
                return <Text style={{ color: colors.textSecondary }}>{t('noData') || 'No data'}</Text>;
              }

              // 分组柱状图：每个货币3柱（收入/支出/余额）
              const maxAbs = Math.max(
                1,
                ...items.flatMap(x => [Math.abs(x.income), Math.abs(x.expense), Math.abs(x.balance)])
              );
              const groupWidth = 72; // 每组x轴宽度
              const barWidth = 14;   // 单根柱宽
              const barGap = 6;      // 组内柱间距
              const chartHeight = 140;

              // 悬浮气泡：选中组（已上移到组件顶层）

              return (
                <View style={{ paddingHorizontal: 12 }}>
                  {/* 顶部悬浮气泡 */}
                  {activeIdx !== null && items[activeIdx] && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 12 }}
                      style={{ marginBottom: 8, maxWidth: '100%' }}
                    >
                      <View
                        style={{
                          alignSelf: 'center',
                          backgroundColor: colors.surface,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: colors.border,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          maxWidth: '100%',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginRight: 8 }}>
                          {items[activeIdx].cur}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.income }}>
                          {t('income') || 'Income'} {formatCurrency(items[activeIdx].income, items[activeIdx].cur as any)}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.expense }}>
                          {t('expense') || 'Expense'} {formatCurrency(items[activeIdx].expense, items[activeIdx].cur as any)}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                          {t('balance') || 'Balance'} {formatCurrency(items[activeIdx].balance, items[activeIdx].cur as any)}
                        </Text>
                      </View>
                    </ScrollView>
                  )}

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 12 }}
                  >
                    <View
                      style={{
                        height: chartHeight + 28,
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                      }}
                    >
                      {items.map((it, idx) => {
                      const hIncome = Math.max(2, (Math.abs(it.income) / maxAbs) * chartHeight);
                      const hExpense = Math.max(2, (Math.abs(it.expense) / maxAbs) * chartHeight);
                      const hBalance = Math.max(2, (Math.abs(it.balance) / maxAbs) * chartHeight);

                      return (
                        <View
                          key={it.cur}
                          style={{
                            width: groupWidth,
                            alignItems: 'center',
                            marginRight: idx === items.length - 1 ? 0 : 8,
                            opacity: activeIdx === null || activeIdx === idx ? 1 : 0.5,
                          }}
                        >
                          <View
                            style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight }}
                            onStartShouldSetResponder={() => true}
                            onResponderRelease={() => setActiveIdx(activeIdx === idx ? null : idx)}
                          >
                            <View style={{ alignItems: 'center', marginRight: barGap }}>
                              <View
                                style={{
                                  width: barWidth,
                                  height: hIncome,
                                  backgroundColor: colors.income,
                                  borderRadius: 6,
                                }}
                              />
                              {/* 移除柱下金额，改为点击弹出顶部气泡 */}
                            </View>
                            <View style={{ alignItems: 'center', marginRight: barGap }}>
                              <View
                                style={{
                                  width: barWidth,
                                  height: hExpense,
                                  backgroundColor: colors.expense,
                                  borderRadius: 6,
                                }}
                              />
                              {/* 移除柱下金额，改为点击弹出顶部气泡 */}
                            </View>
                            <View style={{ alignItems: 'center' }}>
                              <View
                                style={{
                                  width: barWidth,
                                  height: hBalance,
                                  backgroundColor: colors.textTertiary,
                                  borderRadius: 6,
                                }}
                              />
                              {/* 移除柱下金额，改为点击弹出顶部气泡 */}
                            </View>
                          </View>
                          <Text style={{ marginTop: 6, fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                            {it.cur}
                          </Text>
                        </View>
                      );
                      })}
                    </View>
                  </ScrollView>

                  {/* 图例 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, backgroundColor: colors.income, borderRadius: 3 }} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('income') || 'Income'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, backgroundColor: colors.expense, borderRadius: 3 }} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('expense') || 'Expense'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, backgroundColor: colors.textTertiary, borderRadius: 3 }} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('balance') || 'Balance'}</Text>
                    </View>
                  </View>
                  {/* 提示：点击查看数值（本地化） */}
                  <Text style={{ marginTop: 6, textAlign: 'center', fontSize: 12, color: colors.textSecondary }}>
                    {t('tapToViewValues')}
                  </Text>
                </View>
              );
            })()}
          </Card>
        )}





        {(incomeChartData.length > 0 || expenseChartData.length > 0) && (
          <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('pieChart')}</Text>
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
          <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('incomeTopCategories')}</Text>
            </View>
            {incomeTop.map(item => (
              <View key={item.category} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]} >
                    {displayNameFor({ id: String(item.category), name: String(item.category) }, 'incomeCategories', t as any, language as any)}
                  </Text>
                  <Text style={[styles.categoryAmount, { color: colors.textSecondary }]} >
                    {formatCurrency(item.amount, currency as any)}
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
          <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={styles.sectionHeader}>
              <TrendingDown size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('expenseTopCategories')}</Text>
            </View>
            {expenseTop.map(item => (
              <View key={item.category} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]} >
                    {displayNameFor({ id: String(item.category), name: String(item.category) }, 'expenseCategories', t as any, language as any)}
                  </Text>
                  <Text style={[styles.categoryAmount, { color: colors.textSecondary }]} >
                    {formatCurrency(item.amount, currency as any)}
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