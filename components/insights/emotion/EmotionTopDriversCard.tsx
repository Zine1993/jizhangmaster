import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useRouter } from 'expo-router';

type Tx = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  emotion?: { name: string; emoji?: string };
  currency?: string;
  date: string | number | Date;
};

type Props = {
  weekTx: Tx[];
};

function pctDelta(a: number, b: number) {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
}

export default function EmotionTopDriversCard({ weekTx }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const data = useMemo(() => {
    const items = weekTx.filter(x => x.type === 'expense' && x.emotion?.name && x.category && x.amount > 0);
    if (items.length === 0) {
      return { top: [] as { key: string; emotion: string; emoji?: string; category: string; avg: number; overall: number; deltaPct: number }[], conf: 0 };
    }
    // overall by category baseline
    const byCat: Record<string, { sum: number; n: number }> = {};
    for (const it of items) {
      const k = it.category!;
      (byCat[k] ||= { sum: 0, n: 0 });
      byCat[k].sum += it.amount;
      byCat[k].n += 1;
    }
    const overallAvgByCat: Record<string, number> = {};
    Object.keys(byCat).forEach(c => {
      overallAvgByCat[c] = byCat[c].sum / Math.max(1, byCat[c].n);
    });

    // emotion x category avg
    const pair: Record<string, { sum: number; n: number; emotion: string; emoji?: string; category: string }> = {};
    for (const it of items) {
      const ek = it.emotion!.name;
      const ck = it.category!;
      const key = `${ek}||${ck}`;
      (pair[key] ||= { sum: 0, n: 0, emotion: ek, emoji: it.emotion?.emoji, category: ck });
      pair[key].sum += it.amount;
      pair[key].n += 1;
    }

    const rows = Object.values(pair).map(p => {
      const avg = p.sum / Math.max(1, p.n);
      const overall = overallAvgByCat[p.category] ?? 0;
      return {
        key: p.emotion + '|' + p.category,
        emotion: p.emotion,
        emoji: p.emoji,
        category: p.category,
        avg,
        overall,
        deltaPct: pctDelta(avg, overall)
      };
    }).sort((a, b) => (b.deltaPct) - (a.deltaPct)).slice(0, 5);

    // confidence: simple based on count
    const conf = Math.max(0, Math.min(1, items.length / 20));
    return { top: rows, conf };
  }, [weekTx]);

  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>{t('insight.emotion.topDriversTitle') || 'Top Drivers'}</Text>
        <View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 60, height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round((data.conf)*100)}%`, height: 6, backgroundColor: data.conf > 0.6 ? '#22c55e' : data.conf > 0.3 ? '#f59e0b' : '#ef4444' }} />
          </View>
          <Text style={{ fontSize: 11, color: '#666', marginLeft: 6 }}>{t('insight.emotion.confidence') || 'Confidence'}</Text>
        </View>
      </View>

      {data.top.length === 0 ? (
        <Text style={{ color: '#666' }}>{t('insight.emotion.empty') || 'No data yet'}</Text>
      ) : data.top.map((r) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ width: 28, textAlign: 'center' }}>{r.emoji || '🙂'}</Text>
          <Text style={{ flex: 1 }} numberOfLines={1}>{r.emotion} · {r.category}</Text>
          <Text style={{ color: r.deltaPct >= 0 ? '#ef4444' : '#22c55e', fontWeight: '700' }}>
            {r.deltaPct >= 0 ? '+' : ''}{Math.round(r.deltaPct)}%
          </Text>
        </View>
      ))}

      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.push('/emotion-insight/top-drivers')}>
          <Text style={{ color: '#7c3aed' }}>{t('insight.emotion.viewDetail') || 'View detail'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Text style={{ color: '#7c3aed' }}>{t('insight.emotion.createRule') || 'Create rule'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}