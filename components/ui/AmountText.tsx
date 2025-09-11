import React, { memo } from 'react';
import { Text, TextProps, StyleProp, TextStyle, View, ViewStyle } from 'react-native';

type AmountTextProps = {
  value: string | number;           // 已格式化或原始数字，组件不做数值格式化（外部自行 formatCurrency）
  prefix?: string;                  // 如 '+' / '-' 或 货币符号（若外部未包含）
  suffix?: string;                  // 如 '元'、币种符号等（若外部需要）
  color?: string;                   // 文本颜色
  maxWidth?: number;                // 限定最大宽度（如首页卡片）
  style?: StyleProp<TextStyle>;     // 额外文本样式（字号、粗细等）
  containerStyle?: StyleProp<ViewStyle>; // 外层容器样式（用于右对齐等场景）
  align?: 'left' | 'center' | 'right';
};

const AmountText: React.FC<AmountTextProps & TextProps> = ({
  value,
  prefix = '',
  suffix = '',
  color,
  maxWidth,
  style,
  containerStyle,
  align = 'right',
  ...rest
}) => {
  // 不做最小缩放限制：adjustsFontSizeToFit=true，但不提供 minimumFontScale
  // 始终单行展示，自动缩放以适配 maxWidth 或父容器剩余宽度
  const text = `${prefix || ''}${value}${suffix || ''}`;

  const textStyle: StyleProp<TextStyle> = [
    { color, textAlign: align as any },
    style,
  ];

  const wrapStyle: StyleProp<ViewStyle> = [
    { maxWidth: maxWidth, alignSelf: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' },
    containerStyle,
  ];

  return (
    <View style={wrapStyle}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        // 不设置 minimumFontScale，允许无限缩小以保证不挤压其他内容
        style={textStyle}
        {...rest}
      >
        {text}
      </Text>
    </View>
  );
};

export default memo(AmountText);