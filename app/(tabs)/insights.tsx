import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Activity, Settings } from 'lucide-react-native';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
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
          emotion: displayNameFor({ id: String(top?.name || ''), name: String(top?.name || '') }, 'emotions', t as any, language as any),
          share: (topShare * 100).toFixed(0),
          avg: formatCurrency(topAvg, currency as any),
          overallAvg: formatCurrency(avgAll, currency as any)
        })
      );
    }
    const deltaStr = `${riseAmtPct >= 0 ? '+' : ''}${(riseAmtPct * 100).toFixed(0)}`;
    lines.push(
      t('patternWeekCompareLine', {
        amount: formatCurrency(totalAmt, currency as any),
        delta: deltaStr
      })
    );
    return lines;
  }, [top, topShare, topAvg, avgAll, totalAmt, riseAmtPct, t]);

  const adviceLines = React.useMemo(() => {
    const lines: string[] = [];
    if (top && topAvg > avgAll * 1.3) {
      lines.push(
        t('adviceHighAvg', {
          emotion: displayNameFor({ id: String(top?.name || ''), name: String(top?.name || '') }, 'emotions', t as any, language as any),
          threshold: formatCurrency(topAvg * 1.2, currency as any)
        })
      );
    }
    if (riseAmtPct > 0.2) {
      lines.push(
        t('adviceBudgetCap', {
          cap: formatCurrency(totalAmt * 1.1, currency as any)
        })
      );
    }
    if (!lines.length) {
      lines.push(t('keepRecordingTip'));
    }
    return lines;
  }, [top, topAvg, avgAll, riseAmtPct, totalAmt, t]);

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
              <View key={s.name} style={[styles.rankItem, { borderColor: colors.border }]}>
                <Text style={styles.rankIndex}>{idx + 1}</Text>
                <Text style={styles.rankEmoji}>{s.emoji}</Text>
                <Text style={[styles.rankName, { color: colors.text }]}>
                  {displayNameFor({ id: String(s.name), name: String(s.name) }, 'emotions', t as any, language as any)}
                </Text>
                <Text style={[styles.rankAmount, { color: colors.text }]}>
                  {metric === 'count' ? `${s.count} ${t('spendTimes')}` : formatCurrency(s.amount, currency as any)}
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