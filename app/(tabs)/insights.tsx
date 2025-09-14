import React from 'react';
import { View, Text, StyleSheet, ScrollView, AppState, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Settings, Lightbulb } from 'lucide-react-native';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import { RuleProvider } from '@/contexts/RuleContext';
import EmotionCloudCard from '@/components/insights/emotion/EmotionCloudCard';

import IncomeExpenseRatioCard from '@/components/insights/health/IncomeExpenseRatioCard';

import DebtRiskCard from '@/components/insights/health/DebtRiskCard';
import CashflowForecastCard from '@/components/insights/health/CashflowForecastCard';
import SavingsHealthCard from '@/components/insights/health/SavingsHealthCard';

import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IconButton from '@/components/ui/IconButton';

import formatCurrency from '@/lib/formatCurrency';
import { displayNameFor } from '@/lib/i18n';

export default function InsightsScreen() {
  const { transactions, accounts, getUsageDaysCount, currency } = useTransactions();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();

  // currencySymbol removed; using formatCurrency
  const days = getUsageDaysCount();

  const [metric, setMetric] = React.useState<'count' | 'amount'>('count');
  const [rankType, setRankType] = React.useState<'expense' | 'income'>('expense');

  const { monday, sunday } = React.useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun,1=Mon,...6=Sat
    const diffToMonday = day === 0 ? -6 : 1 - day; // Monday as start
    const m = new Date(now);
    m.setHours(0, 0, 0, 0);
    m.setDate(m.getDate() + diffToMonday);
    const s = new Date(m);
    s.setDate(m.getDate() + 6);
    s.setHours(23, 59, 59, 999);
    return { monday: m, sunday: s };
  }, []);



  // 使用实际交易币种进行聚合（emotion + currency）
  const statsSorted = React.useMemo(() => {
    type Row = { name: string; emoji: string; currency?: string; amount: number; count: number };
    const map = new Map<string, Row>();
    for (const t of transactions) {
      if (t.type !== rankType) continue;
      const d = new Date(t.date);
      if (d.getTime() < monday.getTime() || d.getTime() > sunday.getTime()) continue;
      const key = `${String(t.emotion || '')}__${String((t as any).currency || '')}`;
      const cur = map.get(key) || { name: String(t.emotion || ''), emoji: (t as any).emoji || '📝', currency: (t as any).currency, amount: 0, count: 0 };
      cur.amount += t.amount;
      cur.count += 1;
      map.set(key, cur);
    }
    const arr = Array.from(map.values());
    return arr.sort((a, b) => (metric === 'count' ? b.count - a.count : b.amount - a.amount));
  }, [transactions, monday, sunday, metric, rankType]);

  // 预算进度分析：读取预算并计算进行中预算的使用率
  type Budget = { id: string; name: string; currency?: string; amount: number; startDate: string; endDate: string; enabled?: boolean };
  const [budgetsForInsights, setBudgetsForInsights] = React.useState<Budget[]>([]);
  const loadBudgets = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@budgets_v1');
      const arr = raw ? (JSON.parse(raw) as Budget[]) : [];
      setBudgetsForInsights(Array.isArray(arr) ? arr : []);
    } catch {
      setBudgetsForInsights([]);
    }
  }, []);

  // 首次加载
  React.useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // 页面聚焦时刷新（从预算设置返回时自动同步）
  useFocusEffect(
    React.useCallback(() => {
      loadBudgets();
      return undefined;
    }, [loadBudgets])
  );

  // 从后台回到前台时刷新，确保跨场景同步
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadBudgets();
    });
    return () => sub.remove();
  }, [loadBudgets]);

  const budgetSummary = React.useMemo(() => {
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const today = startOf(new Date());

    type Item = { id: string; name: string; percent: number; over: boolean };
    const ongoing: Item[] = [];
    let overs = 0;

    for (const b of budgetsForInsights) {
      if (b.enabled === false) continue;
      const bs = startOf(new Date(b.startDate));
      const be = endOf(new Date(b.endDate));
      if (be < today || bs > today) continue; // 仅统计“进行中”

      // 计算在预算周期内的支出（按币种匹配）
      let spent = 0;
      const total = Number(b.amount) || 0;
      for (const tx of transactions) {
        if (tx.type !== 'expense') continue;
        const td = new Date(tx.date);
        if (td < bs || td > be) continue;
        if (b.currency && (tx as any).currency && (tx as any).currency !== b.currency) continue;
        spent += tx.amount;
      }
      const percent = total > 0 ? Math.round(Math.min(100, Math.max(0, (spent / total) * 100))) : 0;
      const over = total > 0 && spent > total;
      if (over) overs += 1;
      ongoing.push({ id: b.id, name: b.name, percent, over });
    }

    const count = ongoing.length;
    const avgPercent = count ? Math.round(ongoing.reduce((s, i) => s + i.percent, 0) / count) : 0;
    const top = ongoing.slice().sort((a, b) => b.percent - a.percent)[0] || null;
    return { count, avgPercent, overs, top, total: budgetsForInsights.length };
  }, [budgetsForInsights, transactions]);

  // Derived analytics for pattern analysis and smart advice

  // ——— 财务状态洞察数据生成（基于真实交易） ———
  type Insight = {
    emotion: string;
    title: string;
    amount: { currency: string; value: number; type: 'expense' | 'income' };
    diff: string;
    suggestion: string;
    emoji: string;
    chartData: { label: string; value: number; currency: string; type: 'expense' | 'income' }[];
  };

  const toKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0).getTime();

  const thisWeekRange = React.useMemo(() => {
    // 与上文 monday/sunday 对齐
    return { start: new Date(monday), end: new Date(sunday) };
  }, [monday, sunday]);

  const lastWeekRange = React.useMemo(() => {
    const s = new Date(thisWeekRange.start); s.setDate(s.getDate() - 7);
    const e = new Date(thisWeekRange.end);   e.setDate(e.getDate() - 7);
    return { start: s, end: e };
  }, [thisWeekRange]);

  const inRange = (dateInput: string | Date, start: Date, end: Date) => {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return d >= start && d <= end;
  };

  const insightsData = React.useMemo<Insight[]>(() => {
    if (!Array.isArray(transactions) || transactions.length === 0) return [];

    // 收集本周和上周：按 emotion + type + currency 聚合
    type Agg = { amount: number; count: number; emoji?: string };
    const thisAgg = new Map<string, Agg>();
    const lastAgg = new Map<string, Agg>();

    const push = (map: Map<string, Agg>, k: string, amt: number, emoji?: string) => {
      const cur = map.get(k) || { amount: 0, count: 0, emoji };
      cur.amount += amt;
      cur.count += 1;
      if (emoji && !cur.emoji) cur.emoji = emoji;
      map.set(k, cur);
    };

    for (const tx of transactions) {
      if (!tx.emotion) continue;
      const keyBase = `${tx.emotion}__${(tx as any).currency || ''}__${tx.type}`;
      if (inRange(tx.date, thisWeekRange.start, thisWeekRange.end)) {
        push(thisAgg, keyBase, tx.amount, (tx as any).emoji);
      } else if (inRange(tx.date, lastWeekRange.start, lastWeekRange.end)) {
        push(lastAgg, keyBase, tx.amount, (tx as any).emoji);
      }
    }

    // 将 thisAgg 生成 insight：每个 emotion 下最多挑选一条 expense 与一条 income（若存在）
    const byEmotion: Record<string, { expense?: string; income?: string }> = {};
    for (const k of thisAgg.keys()) {
      const [emotion, currencyCode, type] = k.split('__');
      byEmotion[emotion] = byEmotion[emotion] || {};
      if (type === 'expense' && !byEmotion[emotion].expense) byEmotion[emotion].expense = k;
      if (type === 'income' && !byEmotion[emotion].income) byEmotion[emotion].income = k;
    }

    

    const makeSuggestion = (emotion: string, type: 'expense' | 'income') => {
      return type === 'expense'
        ? t('insight.expenseTip')
        : t('insight.incomeTip');
    };

    const res: Insight[] = [];
    const toReadableEmotion = (e: string) => e; // 可用 displayNameFor 进一步本地化

    Object.entries(byEmotion).forEach(([emotion, pair]) => {
      (['expense','income'] as const).forEach(type => {
        const key = pair[type];
        if (!key) return;
        const [_, currencyCode] = key.split('__');
        const thisRow = thisAgg.get(key)!;
        const lastRow = lastAgg.get(key);
        const lastAmt = Math.max(0, lastRow?.amount || 0);
        const thisAmt = Math.max(0, thisRow.amount || 0);
        const diffPct = lastAmt > 0 ? (thisAmt - lastAmt) / lastAmt : (thisAmt > 0 ? 1 : 0);
        const diffStr = `${diffPct >= 0 ? '+' : ''}${Math.round(diffPct * 100)}%`;

        // chartData：该 emotion 下，同类型的“Top 类目/标签”占比（暂用 this vs other 简化）
        const totalThisEmotionType = Array.from(thisAgg.entries())
          .filter(([k]) => k.startsWith(`${emotion}__`) && k.endsWith(`__${type}`))
          .reduce((s, [, r]) => s + Math.max(0, r.amount), 0);

        const mainVal = thisAmt;
        const otherVal = Math.max(0, totalThisEmotionType - thisAmt);

        {
          const emName = displayNameFor({ id: emotion, name: emotion }, 'emotions', t as any, language as any);
          const titleText = type === 'expense'
            ? t('insight.expenseTitle', { emName })
            : t('insight.incomeTitle', { emName });
          res.push({
            emotion: toReadableEmotion(emotion),
            title: titleText,
            amount: { currency: currencyCode || (currency as any), value: type === 'expense' ? -thisAmt : thisAmt, type },
            diff: diffStr,
            suggestion: makeSuggestion(emotion, type),
            emoji: thisRow.emoji || (type === 'expense' ? '🧾' : '💵'),
            chartData: [
              { label: `${emotion}`, value: Math.round(mainVal), currency: currencyCode || (currency as any), type },
              { label: t('others'), value: Math.round(otherVal), currency: currencyCode || (currency as any), type },
            ],
          });
        }
      });
    });

    // 可按 amount 规模排序，先展示更显著的洞察
    res.sort((a, b) => Math.abs(b.amount.value) - Math.abs(a.amount.value));
    // 限制数量避免过多（可调整）
    return res.slice(0, 6);
  }, [transactions, thisWeekRange, lastWeekRange, currency]);







  // 仅比较与 Top 情绪同币种的上周交易










  // 基于筛选（情绪/币种）的派生计算












  const adviceLines = React.useMemo(() => {
    // 暂时移除复杂依赖，仅保留通用提示，避免引用已删除变量
    return [t('keepRecordingTip')];
  }, [t]);

  return (
    <RuleProvider>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader
        variant="emojiTicker"
        right={
          <IconButton onPress={() => router.push('/settings')}>
            <Settings size={24} color="#fff" />
          </IconButton>
        }
      />
      <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('insights')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{t('insightsSubtitle')}</Text>
      </Card>

      {/* 可滚动内容区域：预算进度分析放在第一位，与其他卡片一起滚动 */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 95 }}>
        {/* 预算进度分析：与下方一致滚动 */}
        <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View style={styles.sectionHeader}>
            <Activity size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('insight.sectionBudgetAnalysis')}</Text>
          </View>
          {budgetsForInsights.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('noData')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 12 }}>
              {budgetsForInsights.map((b) => {
                const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
                const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
                const bs = startOf(new Date(b.startDate));
                const be = endOf(new Date(b.endDate));
                let spent = 0;
                const total = Number(b.amount) || 0;
                for (const tx of transactions) {
                  if (tx.type !== 'expense') continue;
                  const td = new Date(tx.date);
                  if (td < bs || td > be) continue;
                  if (b.currency && (tx as any).currency && (tx as any).currency !== b.currency) continue;
                  spent += tx.amount;
                }
                const percentNum = total > 0 ? (spent / total) * 100 : 0;
                const percent = Math.round(Math.min(100, Math.max(0, percentNum)));
                const over = total > 0 && spent > total;
                const barColor = over ? colors.expense : percent >= 80 ? '#F59E0B' : colors.primary;

                return (
                  <View key={b.id} style={{ width: 260 }}>
                    <View style={[styles.tipBox, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '33' }]}>
                      <Text style={{ fontSize: 18 }}>🎯</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.tipText, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                          {b.name}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {b.startDate} ~ {b.endDate}{b.currency ? ` · ${b.currency}` : ''}
                        </Text>
                        <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden', marginTop: 6 }}>
                          <View style={{ width: `${percent}%`, height: '100%', backgroundColor: barColor }} />
                        </View>
                        <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            {formatCurrency(spent, (b.currency as any) || (currency as any))} / {formatCurrency(total, (b.currency as any) || (currency as any))}
                          </Text>
                          {over ? (
                            <Text style={{ color: colors.expense, fontSize: 12, fontWeight: '600' }}>{t('overspent')}</Text>
                          ) : (
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{percent}%</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Card>

        {/* 情绪云 */}
        <EmotionCloudCard />

        {/* 财务健康评估：四张子卡（收支比、债务、现金流、储蓄） */}
        <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>
              {t('insight.health.sectionTitle')}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {(() => {
              // 数据校验标志
              const hasThisMonthTx = transactions.some(tx => {
                const now = new Date();
                const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                const ts = new Date(tx.date || (tx as any).createdAt || now).getTime();
                return ts >= m0;
              });
              const hasHistory = transactions.length >= 1;
              const monthsSet = new Set<string>();
              transactions.forEach(tx => {
                const d = new Date(tx.date || (tx as any).createdAt || new Date());
                monthsSet.add(`${d.getFullYear()}-${d.getMonth()+1}`);
              });
              const monthHistoryCount = monthsSet.size;
              const now = new Date();
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
              const thisMonthTx = transactions.filter(tx => {
                const ts = new Date(tx.date || (tx as any).createdAt || now).getTime();
                return ts >= monthStart;
              });
              const currencyCode = (Array.isArray(transactions) && (transactions[0] as any)?.currency) || (currency as any) || 'CNY';
              const monthIncome = thisMonthTx.filter(ti => ti.type === 'income').reduce((s, ti) => s + Math.max(0, ti.amount || 0), 0);
              const monthExpense = thisMonthTx.filter(te => te.type === 'expense').reduce((s, te) => s + Math.abs(te.amount || 0), 0);

              // 负债占位：识别账号名或类型中的关键词
              const debtAccounts = (accounts?.filter?.((a: any) =>
                /credit|loan|债|借|分期/i.test(String(a?.type || '')) ||
                /信用|分期|花呗|白条/i.test(String(a?.name || ''))
              ) || []) as Array<{ name?: string; type?: string; balance?: number; debt?: number }>;
              const debts = debtAccounts.map((a) => ({
                name: String(a.name || ''),
                amount: Math.max(0, a.debt || (a.balance && a.balance < 0 ? -a.balance : 0) || 0),
              }));

              // 近6个月净现金流
              const byMonth = new Map<string, number>();
              transactions.forEach(tx => {
                const d = new Date(tx.date || (tx as any).createdAt || now);
                const key = `${d.getFullYear()}-${d.getMonth()+1}`;
                const val = (tx.type === 'income' ? 1 : -1) * Math.abs(tx.amount || 0);
                byMonth.set(key, (byMonth.get(key) || 0) + val);
              });
              const sortedKeys = Array.from(byMonth.keys()).sort((a,b)=> {
                const [ay,am]=a.split('-').map(Number); const [by,bm]=b.split('-').map(Number);
                return ay===by ? am-bm : ay-by;
              }).slice(-6);
              const history = sortedKeys.map(k => ({ label: k, value: byMonth.get(k) || 0 }));

              // 可动用储蓄 & 月均支出（近3个月）
              const liquid = (
                accounts?.filter?.((a: any) => !/credit|loan|债|借/i.test(String(a?.type || '')))
                  .reduce?.((s: number, a: any) => s + (Number(a?.balance) || 0), 0)
              ) || 0;
              const monthExpenseAvg = (() => {
                const expByMonth = new Map<string, number>();
                transactions.filter(t=>t.type==='expense').forEach(tx=>{
                  const d = new Date(tx.date || (tx as any).createdAt || now);
                  const key = `${d.getFullYear()}-${d.getMonth()+1}`;
                  expByMonth.set(key, (expByMonth.get(key) || 0) + Math.abs(tx.amount || 0));
                });
                const keys = Array.from(expByMonth.keys()).sort().slice(-3);
                const sum = keys.reduce((s,k)=> s + (expByMonth.get(k) || 0), 0);
                return keys.length ? sum / keys.length : monthExpense || 0;
              })();

              // 传入数据充足性提示
              const ratioHint = hasThisMonthTx ? null : t('dataHint.thisMonthRequired');
              const debtHint = (debts && debts.length > 0 && monthIncome > 0) ? null : t('dataHint.debtSetup');
              const flowHint = monthHistoryCount >= 3 ? null : t('dataHint.historyFew');
              const savingHint = (typeof liquid === 'number' && monthExpenseAvg > 0) ? null : t('dataHint.savingSetup');

              return (
                <>
                  <IncomeExpenseRatioCard agg={{ income: monthIncome, expense: monthExpense }} hint={ratioHint || undefined} />
                  <DebtRiskCard monthlyIncome={Math.max(monthIncome, 0)} debts={debts} hint={debtHint || undefined} />
                  <CashflowForecastCard history={history} hint={flowHint || undefined} />
                  <SavingsHealthCard liquidSavings={Math.max(liquid,0)} monthlyExpenseAvg={Math.max(monthExpenseAvg,0)} hint={savingHint || undefined} />
                </>
              );
            })()}
          </ScrollView>
          <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 12 }}>
            {t('swipeForMore')}
          </Text>
        </Card>

        <Card padding={16}>
          <View style={styles.sectionHeader}>
            <Lightbulb size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('insight.sectionSmartAdvice')}</Text>
          </View>
          <View style={[styles.tipBox, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '33', marginTop: 12 }]}>
            <Text style={{ fontSize: 18 }}>💡</Text>
            <View style={{ flex: 1 }}>
              {adviceLines.map((line, i) => (
                <Text key={i} style={{ color: colors.text, marginBottom: 4 }}>{line}</Text>
              ))}
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                {t('usedDaysPrefix')}{days} {t('daysUnit')}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
    </RuleProvider>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, minWidth: 0, overflow: 'hidden' },
  pageTitle: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  dropdownBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { padding: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  rankIndex: { width: 18, textAlign: 'center', fontWeight: '700' },
  rankEmoji: { width: 24, textAlign: 'center' },
  rankName: { flex: 1, fontWeight: '600' },
  rankAmount: { fontWeight: '700' },
  tipBox: { borderRadius: 12, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  tipText: { flex: 1, lineHeight: 20 },
});