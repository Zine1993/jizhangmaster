import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'expo-router';

type Tx = {
  type: 'income' | 'expense';
  amount: number;
  emotion?: { name: string };
  date: string | number | Date;
};

type Props = { weekTx: Tx[] };

export default function EmotionBudgetImpactCard({ weekTx }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const stats = useMemo(() => {
    const exp = weekTx.filter(x => x.type === 'expense' && x.amount > 0);
    const total = exp.reduce((s, x) => s + x.amount, 0);
    const byEmotion: Record<string, { sum: number; n: number }> = {};
    for (const it of exp) {
      const e = it.emotion?.name || 'unknown';
      (byEmotion[e] ||= { sum: 0, n: 0 });
      byEmotion[e].sum += it.amount;
      byEmotion[e].n += 1;
    }
    const entries = Object.entries(byEmotion).map(([e, v]) => ({ e, share: total > 0 ? v.sum / total : 0, sum: v.sum, n: v.n }))
      .sort((a, b) => b.share - a.share).slice(0, 4);
    const risk = Math.min(1, entries.reduce((s, r) => s + r.share, 0)); // 简化：集中度越高风险越高
    return { entries, risk };
  }, [weekTx]);

  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>{t('insight.emotion.budgetImpactTitle') || 'Budget Impact'}</Text>
        <View style={{ width: 60, height: 6, backgroundColor: '#eee', borderRadius: 3, marginLeft: 8 }}>
          <View style={{ width: `${Math.round(stats.risk*100)}%`, height: 6, backgroundColor: stats.risk > 0.6 ? '#ef4444' : stats.risk > 0.3 ? '#f59e0b' : '#22c55e', borderRadius: 3 }} />
        </View>
      </View>

      {stats.entries.length === 0 ? (
        <Text style={{ color: '#666' }}>{t('insight.emotion.empty') || 'No data yet'}</Text>
      ) : stats.entries.map((r) => (
        <View key={r.e} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1}>{r.e}</Text>
          </View>
          <View style={{ width: 120, height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(r.share*100)}%`, height: 6, backgroundColor: '#7c3aed' }} />
          </View>
          <Text style={{ marginLeft: 8, fontWeight: '700' }}>{Math.round(r.share*100)}%</Text>
        </View>
      ))}

      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#7c3aed' }} onPress={() => router.push('/emotion-insight/budget-impact')}>
          {t('insight.emotion.viewDetail') || 'View detail'}
        </Text>
        <Text style={{ color: '#7c3aed' }} onPress={() => router.push('/settings')}>
          {t('insight.emotion.adjustBudget') || 'Adjust budget'}
        </Text>
      </View>
    </View>
  );
}