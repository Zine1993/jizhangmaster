import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';

export type ChartPoint = {
  label: string;
  value: number;
  currency: string;
  type: 'expense' | 'income';
  color?: string;
};

type Props = {
  data: ChartPoint[];
  // 兼容旧接口：size/innerRadius/outerRadius
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
  centerEmoji?: string;
  // 新增：radius 优先级更高，用于简化自适应接入
  radius?: number;
};

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function PieChartMini({
  data,
  size: sizeProp = 80,
  innerRadius: innerProp = 26,
  outerRadius: outerProp = 34,
  centerEmoji,
  radius,
}: Props) {
  // 若传入 radius，优先用 radius 推导 size/内外半径（可被显式 innerRadius/outerRadius 覆盖）
  const resolvedOuter = radius ? (outerProp ?? radius) : outerProp;
  const resolvedInner = radius ? (innerProp ?? Math.round((radius as number) * 0.6)) : innerProp;
  const resolvedSize = radius ? (sizeProp ?? ((radius as number) * 2)) : sizeProp;

  const size = resolvedSize;
  const innerRadius = resolvedInner;
  const outerRadius = resolvedOuter;
  const total = React.useMemo(() => data.reduce((s, d) => s + Math.max(0, d.value || 0), 0), [data]);
  const segments = React.useMemo(() => {
    if (total <= 0) return [];
    let acc = 0;
    return data.map((d) => {
      const pct = (Math.max(0, d.value || 0) / total);
      const start = acc * 360;
      const end = (acc + pct) * 360;
      acc += pct;
      return { ...d, start, end };
    });
  }, [data, total]);

  const cx = size / 2;
  const cy = size / 2;
  const strokeW = Math.max(1, outerRadius - innerRadius);

  if (!segments.length) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ color: '#999', fontSize: 12 }}>暂无数据</Text>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {/* 背景环 */}
          <Circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="#E5E7EB" strokeWidth={strokeW} />
          {/* 扇区 */}
          {segments.map((seg, i) => {
            // 绘制外侧圆弧，然后用粗 stroke 实现环形扇区
            const d = arcPath(cx, cy, (innerRadius + outerRadius) / 2, seg.start, seg.end);
            const color = seg.color || '#999';
            return <Path key={i} d={d} stroke={color} strokeWidth={strokeW} fill="none" strokeLinecap="butt" />;
          })}
        </G>
      </Svg>
      {!!centerEmoji && <Text style={{ position: 'absolute', fontSize: 18 }}>{centerEmoji}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
});