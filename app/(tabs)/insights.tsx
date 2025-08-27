import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Activity } from 'lucide-react-native';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';

export default function InsightsScreen() {
  const { getEmotionStats, getUsageDaysCount } = useTransactions();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const stats = getEmotionStats();
  const days = getUsageDaysCount();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader variant="userInfo" />
      <Card padding={16}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('insights')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{t('insightsSubtitle')}</Text>
      </Card>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Card padding={16}>
          <View style={styles.sectionHeader}>
            <Trophy size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('emotionRanking')}</Text>
          </View>
          {stats.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('noData')}</Text>
          ) : (
            stats.slice(0, 3).map((s, idx) => (
              <View key={s.name} style={[styles.rankItem, { borderColor: colors.border }]}>
                <Text style={styles.rankIndex}>{idx + 1}</Text>
                <Text style={styles.rankEmoji}>{s.emoji}</Text>
                <Text style={[styles.rankName, { color: colors.text }]}>{t(s.name)}</Text>
                <Text style={[styles.rankAmount, { color: colors.text }]}>{s.amount.toFixed(0)}</Text>
              </View>
            ))
          )}
        </Card>

        <Card padding={16}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('patternAnalysis')}</Text>
          </View>
          {stats[0] ? (
            <View style={[styles.tipBox, { backgroundColor: '#FDEAD7', borderColor: '#F59E0B33' }]}>
              <Text style={{ fontSize: 18 }}>{stats[0].emoji}</Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                {t('analysisTip').replace('{emotion}', t(stats[0].name))}
              </Text>
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('recordMoreToSee')}</Text>
          )}
        </Card>

        <Card padding={16}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('smartAdvice')}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
            {t('usedDaysPrefix')}{days} {t('daysUnit')} {t('keepRecordingTip')}
          </Text>
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