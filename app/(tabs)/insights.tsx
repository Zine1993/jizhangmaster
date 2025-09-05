import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Activity, Settings } from 'lucide-react-native';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';

export default function InsightsScreen() {
  const { transactions, getEmotionStatsForRange, getUsageDaysCount, getCurrencySymbol } = useTransactions();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const currencySymbol = getCurrencySymbol();
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

  const statsRange = React.useMemo(() => getEmotionStatsForRange(monday, sunday), [getEmotionStatsForRange, monday, sunday]);
  const statsSorted = React.useMemo(() => {
    return [...statsRange].sort((a, b) => (metric === 'count' ? b.count - a.count : b.amount - a.amount));
  }, [statsRange, metric]);

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

  const lastWeekTx = React.useMemo(
    () => transactions.filter(t => t.type === 'expense' && inRange(new Date(t.date), lastWeekRange.start, lastWeekRange.end)),
    [transactions, inRange, lastWeekRange]
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
          emotion: t(top.name),
          share: (topShare * 100).toFixed(0),
          avg: `${currencySymbol}${topAvg.toFixed(2)}`,
          overallAvg: `${currencySymbol}${avgAll.toFixed(2)}`
        })
      );
    }
    const deltaStr = `${riseAmtPct >= 0 ? '+' : ''}${(riseAmtPct * 100).toFixed(0)}`;
    lines.push(
      t('patternWeekCompareLine', {
        amount: `${currencySymbol}${totalAmt.toFixed(2)}`,
        delta: deltaStr
      })
    );
    return lines;
  }, [top, topShare, topAvg, avgAll, currencySymbol, totalAmt, riseAmtPct, t]);

  const adviceLines = React.useMemo(() => {
    const lines: string[] = [];
    if (top && topAvg > avgAll * 1.3) {
      lines.push(
        t('adviceHighAvg', {
          emotion: t(top.name),
          threshold: `${currencySymbol}${(topAvg * 1.2).toFixed(0)}`
        })
      );
    }
    if (riseAmtPct > 0.2) {
      lines.push(
        t('adviceBudgetCap', {
          cap: `${currencySymbol}${(totalAmt * 1.1).toFixed(0)}`
        })
      );
    }
    if (!lines.length) {
      lines.push(t('keepRecordingTip'));
    }
    return lines;
  }, [top, topAvg, avgAll, riseAmtPct, totalAmt, currencySymbol, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader
        variant="userInfo"
        right={
          <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: 8 }}>
            <Settings size={24} color="#fff" />
          </TouchableOpacity>
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
            <View style={{ marginLeft: 'auto', flexDirection: 'row', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
              {(['count','amount'] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMetric(m)}
                  style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: metric === m ? colors.primary + '20' : 'transparent' }}
                >
                  <Text style={{ color: metric === m ? colors.primary : colors.textSecondary }}>{m === 'count' ? t('metricByCount') : t('metricByAmount')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {statsSorted.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('noData')}</Text>
          ) : (
            statsSorted.slice(0, 3).map((s, idx) => (
              <View key={s.name} style={[styles.rankItem, { borderColor: colors.border }]}>
                <Text style={styles.rankIndex}>{idx + 1}</Text>
                <Text style={styles.rankEmoji}>{s.emoji}</Text>
                <Text style={[styles.rankName, { color: colors.text }]}>{t(s.name)}</Text>
                <Text style={[styles.rankAmount, { color: colors.text }]}>
                  {metric === 'count' ? `${s.count} ${t('spendTimes')}` : `${currencySymbol}${s.amount.toFixed(2)}`}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Card padding={16}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('patternAnalysis')}</Text>
          </View>
          {patternLines.length > 0 ? (
            <View style={[styles.tipBox, { backgroundColor: '#FDEAD7', borderColor: '#F59E0B33' }]} >
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
          <View style={{ marginTop: 8 }}>
            {adviceLines.map((line, i) => (
              <Text key={i} style={{ color: colors.text, marginBottom: 4 }}>{line}</Text>
            ))}
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              {t('usedDaysPrefix')}{days} {t('daysUnit')}
            </Text>
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
  tipBox: { borderRadius: 12, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  tipText: { flex: 1, lineHeight: 20 },
});