import React from 'react';
import { View, Text, StyleSheet, ScrollView, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Activity, Settings } from 'lucide-react-native';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IconButton from '@/components/ui/IconButton';
import Chip from '@/components/ui/Chip';
import { formatCurrency } from '@/lib/i18n';
import { displayNameFor } from '@/lib/i18n';

export default function InsightsScreen() {
  const { transactions, getEmotionStatsForRange, getUsageDaysCount, currency } = useTransactions();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();

  // currencySymbol removed; using formatCurrency
  const days = getUsageDaysCount();

  const [metric, setMetric] = React.useState<'count' | 'amount'>('count');

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
      if (t.type !== 'expense') continue;
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
  }, [transactions, monday, sunday, metric]);

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
  const lastWeekRange = React.useMemo(() => {
    const m = new Date(monday);
    m.setDate(m.getDate() - 7);
    m.setHours(0, 0, 0, 0);
    const s = new Date(sunday);
    s.setDate(s.getDate() - 7);
    s.setHours(23, 59, 59, 999);
    return { start: m, end: s };
  }, [monday, sunday]);

  const inRange = React.useCallback((d: Date, start: Date, end: Date) => {
    const ts = d.getTime();
    return ts >= start.getTime() && ts <= end.getTime();
  }, []);

  const weekTx = React.useMemo(
    () => transactions.filter(t => t.type === 'expense' && inRange(new Date(t.date), monday, sunday)),
    [transactions, inRange, monday, sunday]
  );

  // 仅比较与 Top 情绪同币种的上周交易
  const lastWeekTx = React.useMemo(
    () => transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      const inLast = inRange(d, lastWeekRange.start, lastWeekRange.end);
      if (!statsSorted[0]) return inLast;
      const sameEmotion = t.emotion === statsSorted[0].name;
      const sameCurrency = !(statsSorted[0] as any).currency || (t as any).currency === (statsSorted[0] as any).currency;
      return inLast && sameEmotion && sameCurrency;
    }),
    [transactions, inRange, lastWeekRange, statsSorted]
  );

  const totalAmt = React.useMemo(() => weekTx.reduce((s, t) => s + t.amount, 0), [weekTx]);
  const totalCnt = weekTx.length;
  const avgAll = totalCnt ? totalAmt / totalCnt : 0;

  const top = statsSorted[0];
  const topAmt = React.useMemo(
    () => (top ? weekTx.filter(t => t.emotion === top.name).reduce((s, t) => s + t.amount, 0) : 0),
    [weekTx, top]
  );
  const topCnt = React.useMemo(
    () => (top ? weekTx.filter(t => t.emotion === top.name).length : 0),
    [weekTx, top]
  );
  const topShare = totalCnt ? topCnt / totalCnt : 0;
  const topAvg = topCnt ? topAmt / topCnt : 0;

  const lastWeekAmt = React.useMemo(() => lastWeekTx.reduce((s, t) => s + t.amount, 0), [lastWeekTx]);
  const riseAmtPct = lastWeekAmt > 0 ? (totalAmt - lastWeekAmt) / lastWeekAmt : 0;

  const patternLines = React.useMemo(() => {
    const lines: string[] = [];
    if (top) {
      lines.push(
        t('patternTopShareLine', {
          emotion: displayNameFor({ id: String(top?.name || ''), name: String(top?.name || '') }, 'emotions', t as any, language as any),
          share: (topShare * 100).toFixed(0),
          avg: formatCurrency(topAvg, ((top as any)?.currency as any) || (currency as any)),
          overallAvg: formatCurrency(avgAll, (currency as any))
        })
      );
    }
    const deltaStr = `${riseAmtPct >= 0 ? '+' : ''}${(riseAmtPct * 100).toFixed(0)}`;
    lines.push(
      t('patternWeekCompareLine', {
        amount: formatCurrency(totalAmt, (((top as any)?.currency) as any) || (currency as any)),
        delta: deltaStr
      })
    );
    return lines;
  }, [top, topShare, topAvg, avgAll, totalAmt, riseAmtPct, t]);

  const adviceLines = React.useMemo(() => {
    const lines: string[] = [];
    const topCurrency = ((top as any)?.currency as any) || (currency as any);
    if (top && topAvg > avgAll * 1.3) {
      lines.push(
        t('adviceHighAvg', {
          emotion: displayNameFor({ id: String(top?.name || ''), name: String(top?.name || '') }, 'emotions', t as any, language as any),
          threshold: formatCurrency(topAvg * 1.2, topCurrency)
        })
      );
    }
    if (riseAmtPct > 0.2) {
      lines.push(
        t('adviceBudgetCap', {
          cap: formatCurrency(totalAmt * 1.1, topCurrency)
        })
      );
    }
    if (!lines.length) {
      lines.push(t('keepRecordingTip'));
    }
    return lines;
  }, [top, topAvg, avgAll, riseAmtPct, totalAmt, t, currency]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader
        variant="emojiTicker"
        right={
          <IconButton onPress={() => router.push('/settings')}>
            <Settings size={24} color="#fff" />
          </IconButton>
        }
      />
      <Card padding={16}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('insights')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{t('insightsSubtitle')}</Text>
      </Card>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 95 }}>
        <Card padding={16}>
          <View style={styles.sectionHeader}>
            <Trophy size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('weeklyEmotionRanking')}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 8 }}>
              {(['count','amount'] as const).map(m => (
                <Chip
                  key={m}
                  selected={metric === m}
                  onPress={() => setMetric(m)}
                >
                  <Text style={{ color: metric === m ? colors.primary : colors.textSecondary }}>
                    {m === 'count' ? t('metricByCount') : t('metricByAmount')}
                  </Text>
                </Chip>
              ))}
            </View>
          </View>
          {statsSorted.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('noData')}</Text>
          ) : (
            statsSorted.slice(0, 3).map((s, idx) => (
              <View key={`${s.name}_${s.currency || 'ALL'}_${idx}`} style={[styles.rankItem, { borderColor: colors.border }]}>
                <Text style={styles.rankIndex}>{idx + 1}</Text>
                <Text style={styles.rankEmoji}>{s.emoji}</Text>
                <Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
                  {displayNameFor({ id: String(s.name), name: String(s.name) }, 'emotions', t as any, language as any)}
                  {!!s.currency ? ` · ${s.currency}` : ''}
                </Text>
                <Text style={[styles.rankAmount, { color: colors.text }]}>
                  {metric === 'count'
                    ? `${s.count} ${t('spendTimes')}`
                    : formatCurrency(s.amount, (s.currency as any) || (currency as any))}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* 预算进度分析：横向轮播单个预算进度，不展示汇总 */}
        <Card padding={16}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('budgetProgressAnalysis')}</Text>
          </View>
          {budgetsForInsights.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('noData')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 12 }}>
              {budgetsForInsights.map((b) => {
                // 仅计算每个预算自身周期内的支出进度
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

        <Card padding={16}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('patternAnalysis')}</Text>
          </View>
          {patternLines.length > 0 ? (
            <View style={[styles.tipBox, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '33' }]} >
              <Text style={{ fontSize: 18 }}>{statsSorted[0]?.emoji || '📈'}</Text>
              <View style={{ flex: 1 }}>
                {patternLines.map((line, i) => (
                  <Text key={i} style={[styles.tipText, { color: colors.text }]}>{line}</Text>
                ))}
              </View>
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('recordMoreToSee')}</Text>
          )}
        </Card>

        <Card padding={16}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('smartAdvice')}</Text>
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
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  pageTitle: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
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