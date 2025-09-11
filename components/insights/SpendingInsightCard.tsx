import React from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency } from '@/lib/i18n';
import PieChartMini, { ChartPoint } from './PieChartMini';

import ViewShot, { captureRef } from 'react-native-view-shot';

type Amount = { currency: string; value: number; type: 'expense' | 'income' };

type Props = {
  emotion: string;
  title: string;
  amount: Amount;
  diff?: string;
  suggestion?: string;
  emoji?: string;
  chartData?: ChartPoint[];
  onUseful?: () => void;
  onShare?: () => void | Promise<void>;
};

const currencySymbolOf = (code: string): string => {
  const map: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    KRW: '₩',
    GBP: '£',
    HKD: 'HK$',
    TWD: 'NT$'
  };
  return map[code] || code;
};

const emotionColor = (emotion: string, fallback: string): string => {
  const preset: Record<string, string> = {
    anxious: '#F87171',
    happy: '#22C55E',
    sad: '#60A5FA',
    angry: '#EF4444',
    calm: '#06B6D4'
  };
  return preset[emotion] || fallback;
};

export default function SpendingInsightCard({
  emotion,
  title,
  amount,
  diff,
  suggestion,
  emoji = '💡',
  chartData = [],
  onUseful,
  onShare,
}: Props) {
  const { colors } = useTheme();
  const shotRef = React.useRef<View>(null);
  const [chartR, setChartR] = React.useState(56);
  const [compact, setCompact] = React.useState(false);
  const [rightFontScale, setRightFontScale] = React.useState(1);

  const isExpense = amount.type === 'expense';
  const amountColor = isExpense ? colors.expense : colors.income;

  // 格式化金额并补符号（若未包含）
  const formatted = formatCurrency(Math.abs(amount.value), amount.currency);
  const sym = currencySymbolOf(amount.currency);
  const hasSymbol = typeof formatted === 'string' && (/^[¥$€£₩]/.test(formatted) || formatted.includes(sym));
  const amountWithSymbol = `${amount.value < 0 ? '-' : ''}${hasSymbol ? formatted : `${formatted} ${sym}`}`;

  // diff 颜色：按正负号
  const diffColor = diff && diff.trim().startsWith('-') ? colors.expense : colors.income;

  // Pie 配色：支出暖色 / 收入冷色
  const expensePalette = ['#EF4444', '#F59E0B', '#FB923C', '#DC2626'];
  const incomePalette  = ['#22C55E', '#06B6D4', '#10B981', '#0EA5E9'];
  const coloredChart: ChartPoint[] = React.useMemo(() => {
    let e = 0, i = 0;
    return (chartData || []).map(seg => ({
      ...seg,
      color: seg.color || (seg.type === 'expense'
        ? expensePalette[e++ % expensePalette.length]
        : incomePalette[i++ % incomePalette.length])
    }));
  }, [chartData]);



  const headerAccent = emotionColor(emotion, colors.primary);

  const handleUseful = React.useCallback(() => {
    onUseful?.();
  }, [onUseful]);

  const handleShare = React.useCallback(async () => {
    // 优先交给外部
    if (onShare) {
      await onShare();
      return;
    }
    try {
      if (!shotRef.current) return;
      // captureRef 也可直接用，兼容性更好
      // 这里用 ViewShot 的 ref.capture() 更直观
      const uri = await (shotRef.current as any).capture?.({
        format: 'png',
        quality: 0.95,
      }) || await captureRef(shotRef, { format: 'png', quality: 0.95 });
      await Share.share({ url: uri as string });
    } catch (e) {
      // 忽略分享错误
    }
  }, [onShare]);

  return (
    <ViewShot
      ref={shotRef as any}
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width || 0;
        // 更容易触发紧凑模式（阈值提升至 340）
        const isCompact = w <= 340;
        setCompact(isCompact);
        setRightFontScale(isCompact ? 0.94 : 1);
      }}
    >
      {/* 顶部标题区已移除，信息放到右侧金额/差值 */}

      {/* 可视化：恢复为左侧饼图（中心emoji），右侧留白 */}
      <View style={styles.hSplit}>
        <View
          style={styles.vizLeft}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width || 0;
            const baseMin = compact ? 36 : 40;
            const baseMax = compact ? 52 : 64;
            const r = Math.max(baseMin, Math.min(baseMax, Math.round(w * 0.45)));
            setChartR((prev) => (prev === r ? prev : r));
          }}
        >
          <PieChartMini
            data={coloredChart}
            centerEmoji={emoji}
            radius={chartR}
            innerRadius={Math.round(chartR * 0.6)}
          />
        </View>
        <View style={[styles.vizRight, { justifyContent: 'center' }]} />
      </View>

      {/* 中部：一句总结建议 */}
      {!!suggestion && (
        <Text
          style={{ color: colors.textSecondary, marginTop: 8, fontSize: Math.round(14 * rightFontScale), lineHeight: Math.round(20 * rightFontScale) }}
          numberOfLines={compact ? 1 : 2}
          ellipsizeMode="tail"
        >
          {suggestion}
        </Text>
      )}

      {/* 操作区 */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Pressable onPress={handleUseful} style={[styles.btn, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={{ fontSize: 16, marginRight: 6 }}>👍</Text>
          <Text style={{ color: colors.text }}>有用</Text>
        </Pressable>
        <Pressable onPress={handleShare} style={[styles.btnPrimary, { backgroundColor: colors.text, borderColor: colors.text }]}>
          <Text style={{ color: colors.background }}>分享</Text>
        </Pressable>
      </View>
    </ViewShot>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    width: 320,
  },
  // 顶部标题行已移除
  emoji: { fontSize: 20 },
  amount: { fontSize: 16, fontWeight: '800' },
  hSplit: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, minWidth: 0 },
  vizLeft: {
    width: 116,
    minWidth: 92,
    maxWidth: 144,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vizRight: {
    flex: 1,
    minWidth: 0,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
});