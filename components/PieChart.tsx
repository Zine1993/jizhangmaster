import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface PieChartData {
  category: string;
  amount: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
}

export default function PieChart({ data, size = 200 }: PieChartProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { width: size, height: size }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noData')}</Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = -90; // Start from top

  const createPath = (startAngle: number, endAngle: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const slices = data.map((item, index) => {
    const percentage = (item.amount / total) * 100;
    const angle = (item.amount / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const path = createPath(startAngle, endAngle);
    currentAngle = endAngle;

    return {
      ...item,
      path,
      percentage,
      startAngle,
      endAngle,
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {slices.map((slice, index) => (
          <Path
            key={index}
            d={slice.path}
            fill={slice.color}
            stroke={colors.background}
            strokeWidth={2}
          />
        ))}
      </Svg>
      
      <View style={styles.legend}>
        {slices.map((slice, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>
              {t(slice.category)} ({slice.percentage.toFixed(1)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  legend: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '500',
  },
});