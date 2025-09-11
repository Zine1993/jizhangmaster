import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent, Animated } from 'react-native';
import Card from '@/components/ui/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useEmotionTags } from '@/contexts/EmotionTagContext';

type TimePeriod = 'last_7_days' | 'this_month' | 'last_month' | 'this_year';

const EMOTION_COLORS: Record<string, string> = {
  '开心': '#FFB300',
  '满足': '#FF4081',
  '期待': '#2196F3',
  '平静': '#4CAF50',
  '焦虑': '#757575',
  '沮丧': '#212121',
};


const POSITIVE = new Set(['开心','满足','期待']);
const NEGATIVE = new Set(['焦虑','沮丧']);
const NEUTRAL  = new Set(['平静']);

interface CloudItem {
  tag: string;
  count: number;
  weight: number; // 0~1
  size: number; // emoji 尺寸
  color: string;
  x: number;
  y: number;
}

function filterByPeriod(ts: number, period: TimePeriod): boolean {
  const d = new Date(ts);
  const now = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  if (period === 'last_7_days') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  }
  if (period === 'this_month') {
    return year === now.getFullYear() && month === now.getMonth();
  }
  if (period === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return year === lm.getFullYear() && month === lm.getMonth();
  }
  if (period === 'this_year') {
    return year === now.getFullYear();
  }
  return true;
}

// 简单中心放射布局，按权重从大到小依次寻找不重叠位置
function layoutCloud(items: Omit<CloudItem,'x'|'y'>[], width: number, height: number): CloudItem[] {
  // 阿基米德螺线 + 细步进采样 + 碰撞退让，营造从中心向外扩散的顺滑排布
  const placed: CloudItem[] = [];
  const cx = width / 2;
  const cy = height / 2;

  const getBox = (n: Omit<CloudItem,'x'|'y'> | CloudItem) => {
    const s = (n as any).size as number;
    const w = s;
    const h = s;
    return { w, h };
  };

  const collide = (a: CloudItem, b: CloudItem) => {
    const { w: aw, h: ah } = getBox(a);
    const { w: bw, h: bh } = getBox(b);
    // 轻微留白，避免贴边拥挤
    const pad = 2;
    return !(
      a.x + aw/2 + pad < b.x - bw/2 ||
      a.x - aw/2 - pad > b.x + bw/2 ||
      a.y + ah/2 + pad < b.y - bh/2 ||
      a.y - ah/2 - pad > b.y + bh/2
    );
  };

  // 按权重降序，让大块优先占据更靠中心的位置
  const sorted = [...items].sort((a, b) => b.weight - a.weight);

  sorted.forEach((it, idx) => {
    // 根据元素尺寸与序号决定初始半径与步进，避免一开始就过挤
    const { w, h } = getBox(it as any);
    const base = Math.max(w, h);
    const aStep = Math.PI / 36;      // 角步进（更细腻）
    const rStep = Math.max(2, base / 6); // 半径步进与尺寸相关
    const jitter = (n: number) => ((n * 137) % 7) - 3; // 轻微抖动避免规则网格

    let angle = 0;
    let radius = Math.max(0, (idx === 0 ? 0 : base / 2));
    let found = false;
    let best: CloudItem | null = null;

    // 螺旋采样上限
    const maxIter = 1200;
    for (let i = 0; i < maxIter; i++) {
      // 阿基米德螺线：r = a + bθ
      const px = cx + (radius + jitter(i)) * Math.cos(angle);
      const py = cy + (radius + jitter(i)) * Math.sin(angle);
      const candidate: CloudItem = { ...(it as any), x: px, y: py };

      const inside =
        px - w/2 >= 0 && px + w/2 <= width &&
        py - h/2 >= 0 && py + h/2 <= height;

      if (inside) {
        const overlaps = placed.some(p => collide(candidate, p));
        if (!overlaps) {
          best = candidate;
          found = true;
          break;
        }
      }

      // 增长角度与半径，形成连续螺旋
      angle += aStep;
      radius += rStep * aStep / (2 * Math.PI); // 每圈半径平滑增长
    }

    if (!found) {
      // 尝试在已放置元素之间寻找插缝：对现有点的角度附近再微调搜索
      const slices = 48;
      for (let s = 0; s < slices && !found; s++) {
        const theta = (2 * Math.PI * s) / slices;
        for (let rr = base / 2; rr < Math.min(width, height) / 1.8; rr += Math.max(2, base / 8)) {
          const px = cx + rr * Math.cos(theta);
          const py = cy + rr * Math.sin(theta);
          const candidate: CloudItem = { ...(it as any), x: px, y: py };
          const inside =
            px - w/2 >= 0 && px + w/2 <= width &&
            py - h/2 >= 0 && py + h/2 <= height;
          if (!inside) continue;
          const overlaps = placed.some(p => collide(candidate, p));
          if (!overlaps) {
            best = candidate;
            found = true;
            break;
          }
        }
      }
    }

    if (!found) {
      // 最终兜底：钳制到边界内（尽量保留当前位置的角度关系）
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      const clampedX = Math.max(w/2, Math.min(width - w/2, px));
      const clampedY = Math.max(h/2, Math.min(height - h/2, py));
      best = { ...(it as any), x: clampedX, y: clampedY };
    }

    placed.push(best!);
  });

  return placed;
}

export default function EmotionCloudCard({ onEmotionClick }: { onEmotionClick?: (tag: string) => void }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { transactions } = useTransactions();
  const { tagsMap, supported } = useEmotionTags();

  const [period, setPeriod] = useState<TimePeriod>('last_7_days');
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });

  const data = useMemo(() => {
    const filtered = transactions.filter(tx => {
      const ts = (tx as any).timestamp ?? (tx as any).date ?? (tx as any).createdAt;
      const time = typeof ts === 'string' ? new Date(ts).getTime() : (typeof ts === 'number' ? ts : new Date(ts || Date.now()).getTime());
      const emotion = String((tx as any).emotion || '');
      return !!emotion && supported.has(emotion) && filterByPeriod(time, period);
    });
    const freq = new Map<string, number>();
    filtered.forEach(tx => {
      const tag = String(tx.emotion);
      freq.set(tag, (freq.get(tag) || 0) + 1);
    });
    const entries = Array.from(freq.entries());
    const max = Math.max(1, ...entries.map(([, v]) => v));
    // emoji 尺寸映射（更小：最小尺寸按系统原始约16）
    const minSize = 16; // 最小表情尺寸（原始大小）
    const mult = 1.6;   // 略降放大倍率，避免过大
    const maxItems = 20; // 仅显示Top N，避免挤满

    const mappedAll = entries
      .filter(([tag]) => supported.has(tag))
      .sort((a,b) => b[1] - a[1])
      .map(([tag, count]) => {
        const weight = count / max;
        const size = Math.max(minSize, minSize + weight * minSize * mult);
        const color = EMOTION_COLORS[tag] || colors.text;
        // 必须有资源
        const res = tagsMap[tag];
        if (!res) return null as any;
        return { tag, count, weight, size, color };
      })
      .filter(Boolean) as any;

    const mapped = mappedAll.slice(0, maxItems);
    // 如果有被截断的，加入一个 “+N” 提示（中性颜色）
    if (mappedAll.length > maxItems) {
      const more = mappedAll.length - maxItems;
      mapped.push({ tag: `+${more}`, count: more, weight: 0.2, size: 20, color: colors.textSecondary as string } as any);
    }

    return { mapped, freq };
  }, [transactions, period, colors.text, colors.textSecondary]);

  const placed = useMemo(() => {
    if (!canvas.w || !canvas.h) return [] as CloudItem[];
    return layoutCloud(data.mapped, canvas.w - 24, Math.max(140, canvas.h - 24)).map(it => ({
      ...it,
      x: it.x + 12,
      y: it.y + 12,
    }));
  }, [data.mapped, canvas]);

  // 摘要文本
  const summary = useMemo(() => {
    const top = [...data.freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, 3);
    if (top.length === 0) return t('noData') || '暂无数据';
    const names = top.map(([k]) => k);
    const dom = names[0];

    let tone = t('good') || '良好';
    if (NEGATIVE.has(dom)) tone = t('needAttention') || '需关注';
    if (NEUTRAL.has(dom))  tone = t('steady') || '平稳';

    const top2 = names[1] ?? '';
    const top3 = names[2] ?? '';
    const sep = top2 && top3 ? '、' : '';

    // 优先本地化插值；若 i18n 未配置对应键，则回退中文组装
    const localized = t('emotionCloudSummary', { dominant: dom, tone, top2, top3, sep });
    if (localized && typeof localized === 'string' && localized !== 'emotionCloudSummary') return localized;

    // 回退：无 top2/top3 时省略“同时较常见”
    if (!top2 && !top3) {
      return `本期情绪云显示，最常感受的是「${dom}」，整体情绪${tone}。`;
    }
    return `本期情绪云显示，最常感受的是「${dom}」，整体情绪${tone}。也经常出现「${top2}${sep}${top3}」等情绪。`;
  }, [data.freq, t]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    // 预设高度：自适应，最小 220
    setCanvas({ w: width, h: Math.max(220, Math.round(width * 0.6)) });
  };

  return (
    <Card style={{ marginTop: 16 }}>
      {/* 第一行：标题 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {t('emotionCloudTitle') || '情绪云'}
        </Text>
      </View>
      {/* 第二行：紧贴标题下方，右对齐的筛选按钮 */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 8 }}>
        {([
          { k: 'last_7_days', label: (t('last7Days') as any) || '近7天' },
          { k: 'this_month',  label: (t('thisMonth') as any) || '本月' },
          { k: 'last_month',  label: (t('lastMonth') as any) || '上个月' },
          { k: 'this_year',   label: (t('thisYear') as any) || '本年' },
        ] as {k: TimePeriod; label: string}[]).map(opt => {
          const active = period === opt.k;
          return (
            <Pressable
              key={opt.k}
              onPress={() => setPeriod(opt.k)}
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: active ? colors.primary + '20' : 'transparent',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 12 }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 词云画布 */}
      <View onLayout={handleLayout} style={{ minHeight: 220, overflow: 'hidden' }}>
        {placed.map((it) => {
          const scale = new Animated.Value(1);
          const onPressIn = () => Animated.spring(scale, { toValue: 1.05, useNativeDriver: true }).start();
          const onPress = () => onEmotionClick?.(it.tag);

          // 形状提示：用阴影/发光模拟
          const glow = it.tag === '开心' ? `${EMOTION_COLORS['开心']}55` :
                       it.tag === '焦虑' ? `${EMOTION_COLORS['焦虑']}55` : 'transparent';

          return (
            <Animated.View
              key={it.tag}
              style={{
                position: 'absolute',
                left: it.x,
                top: it.y,
                transform: [{ translateX: -it.size / 2 }, { translateY: -it.size / 2 }, { scale }],
                shadowColor: glow !== 'transparent' ? EMOTION_COLORS[it.tag] : 'transparent',
                shadowOpacity: glow !== 'transparent' ? 0.5 : 0,
                shadowRadius: glow !== 'transparent' ? 8 : 0,
              }}
            >
              <Pressable onPressIn={onPressIn} onPress={onPress}>
                {(() => {
                  const res = tagsMap[it.tag];
                  if (!res) return null;
                  if (res.type === 'emoji') {
                    return <Text style={{ fontSize: it.size, textAlign: 'center' }}>{res.value}</Text>;
                  }
                  const Img = require('react-native').Image;
                  return <Img source={res.value} style={{ width: it.size, height: it.size }} resizeMode="contain" />;
                })()}
              </Pressable>
            </Animated.View>
          );
        })}
        {placed.length === 0 && (
          <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>{t('noEmotionData') || '本期没有情绪数据'}</Text>
          </View>
        )}
      </View>

      {/* 摘要面板 */}
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
          {summary}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
});