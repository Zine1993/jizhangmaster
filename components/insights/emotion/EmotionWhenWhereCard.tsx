import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'expo-router';

type Tx = {
  type: 'income' | 'expense';
  amount: number;
  emotion?: { name: string; emoji?: string };
  date: string | number | Date;
};

type Props = { weekTx: Tx[] };

function hourOf(d: Date) { return d.getHours(); }
function wdayOf(d: Date) { return (d.getDay() + 6) % 7; /* Mon=0 */ }

export default function EmotionWhenWhereCard({ weekTx }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    let total = 0;
    for (const it of weekTx) {
      if (!it.emotion?.name) continue;
      const d = new Date(it.date);
      const r = wdayOf(d), c = hourOf(d);
      g[r][c] += 1;
      total += 1;
    }
    return { g, total };
  }, [weekTx]);

  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>{t('insight.emotion.whenWhereTitle') || 'When & Where'}</Text>
        <Text style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>{t('insight.emotion.timeTip') || 'Peaks across week/day'}</Text>
      </View>

      {grid.total === 0 ? (
        <Text style={{ color: '#666' }}>{t('insight.emotion.empty') || 'No data yet'}</Text>
      ) : (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {grid.g.map((row, i) => (
            <View key={i} style={{ gap: 2 }}>
              {row.map((v, j) => {
                const intensity = Math.min(1, v / 3);
                const color = `rgba(124, 58, 237, ${0.15 + intensity * 0.85})`;
                return <View key={j} style={{ width: 8, height: 8, backgroundColor: color, borderRadius: 2 }} />;
              })}
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#7c3aed' }} onPress={() => router.push('/emotion-insight/when-where')}>
          {t('insight.emotion.viewDetail') || 'View detail'}
        </Text>
        <Text style={{ color: '#7c3aed' }} onPress={() => router.push('/settings')}>
          {t('insight.emotion.enableTimeAlerts') || 'Enable time alerts'}
        </Text>
      </View>
    </View>
  );
}