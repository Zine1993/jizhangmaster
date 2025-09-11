import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/contexts/LanguageContext';
import { Transaction, useTransactions } from '@/contexts/TransactionContext';
import { useEmotionTags } from '@/contexts/EmotionTagContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Check } from 'lucide-react-native';
import { formatCurrency } from '@/lib/i18n';
import AmountText from '@/components/ui/AmountText';
import { displayNameFor } from '@/lib/i18n';



interface TransactionItemProps {
  transaction: Transaction;
  onDelete?: () => void;
}

function formatDateYYYYMMDD(date: Date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TransactionItem({ transaction, onDelete }: TransactionItemProps) {
  const { t, language } = useLanguage();
  const { deleteTransaction, /* emotions, */ currency } = useTransactions();
  const { colors } = useTheme();
  const { tagsMap } = useEmotionTags();

  const isIncome = transaction.type === 'income';
  const color = isIncome ? colors.income : colors.expense;
  
  // 始终显示完整金额，配合 Text 的自适应缩放避免溢出
  const formattedAmount = React.useMemo(() => {
    const code = (transaction as any)?.currency || (currency as any);
    const amt = Number(transaction.amount) || 0;
    return formatCurrency(amt, code as any);
  }, [transaction.amount, transaction, currency, language]);

  // Long-press 2s circular countdown
  const [counting, setCounting] = React.useState(false);
  const [isDeleted, setIsDeleted] = React.useState(false);
  const progress = React.useRef(new Animated.Value(0)).current;
  const timerRef = React.useRef<any>(null);

  // dynamic modules (avoid TS/module not found if not installed)


  const SvgCompRef = React.useRef<any>(null);
  const CircleCompRef = React.useRef<any>(null);
  React.useEffect(() => {

    try {
      const m = require('react-native-svg');
      // default export is Svg in ESM, fallback to m.Svg or m itself
      SvgCompRef.current = m?.default || m?.Svg || m;
      // Circle is a named export; in some bundles it can be under default
      CircleCompRef.current = m?.Circle || m?.default?.Circle;
    } catch {}
  }, []);

  const size = 48;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const AnimatedCircle = React.useMemo(() => {
    const C = CircleCompRef.current;
    return C ? Animated.createAnimatedComponent(C) : null;
  }, [CircleCompRef.current]);



  const cancelCountdown = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    progress.stopAnimation();
    progress.setValue(0);
    setCounting(false);
  }, [progress]);

  const startCountdown = React.useCallback(() => {
    cancelCountdown();
    setCounting(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    }).start((result) => {
      // Check if the animation completed without being interrupted by cancelCountdown
      if (result.finished) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsDeleted(true);
        
        // Use a minimal timeout to allow the checkmark to render before deleting
        setTimeout(() => {
          deleteTransaction(transaction.id);
          onDelete?.();
        }, 50);
      }
    });
  }, [cancelCountdown, progress, deleteTransaction, transaction.id, onDelete]);
  const title = displayNameFor(
    { id: String(transaction.category || ''), name: String(transaction.category || '') },
    (transaction.type === 'income') ? 'incomeCategories' : 'expenseCategories',
    t as any,
    language as any
  );

  const emoji = (() => {
    const key = String(transaction.emotion || '').trim();
    if (!key) return '🙂';
    const res = (tagsMap || {})[key];
    if (!res) return '🙂';
    return res.type === 'emoji' ? String(res.value) : '🙂';
  })();







  // 运行时动态测量宽度：header 总宽、类别宽
  const [headerW, setHeaderW] = React.useState(0);
  const [categoryW, setCategoryW] = React.useState(0);

  // 常量：与样式保持一致
  const EMOJI_WRAP_W = 40; // styles.emojiWrap width
  const EMOJI_GAP = 12;    // emoji 与内容之间的 marginRight
  const GAP_BETWEEN_TITLE_AND_AMOUNT = 8; // titleRow 与金额之间的 marginLeft
  const H_PADDING = 14; // container paddingHorizontal

  const computedAmountWidth = React.useMemo(() => {
    if (!headerW) return undefined;
    // header 区域是容器的内容区（不含外部 padding），这里 headerW 是按 onLayout 得到的 header 自身宽度
    // 我们要从 header 总宽里扣除：类别实际宽 + 两侧间距
    const minW = 110;
    const maxW = 180;
    // headerW 已经不含 emoji 区域，因 emoji 不在 header 内；我们只需减去标题与金额之间的间距
    const rest = headerW - categoryW - GAP_BETWEEN_TITLE_AND_AMOUNT;
    const w = Math.max(minW, Math.min(maxW, Math.floor(rest)));
    return isFinite(w) && w > 0 ? w : minW;
  }, [headerW, categoryW]);

  return (
      <Pressable
        style={[
          styles.container,
          { backgroundColor: colors.inputBackground, shadowColor: '#000000' },
        ]}
        onLongPress={startCountdown}
        onPressOut={cancelCountdown}
        delayLongPress={200}
      >
      <View style={styles.emojiWrap}>
        <View style={[styles.emojiContainer, { backgroundColor: colors.surface }]}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>
        {(() => {
          const SvgC = SvgCompRef.current;
          const CircleC = CircleCompRef.current;
          if (counting && SvgC && CircleC && AnimatedCircle) {
            const offset = (40 - size) / 2;
            return (
              <SvgC width={size} height={size} style={{ position: 'absolute', top: offset, left: offset }}>
                <CircleC
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={colors.primary}
                  strokeOpacity={0.25}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <AnimatedCircle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={colors.primary}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${circumference}, ${circumference}`}
                  strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              </SvgC>
            );
          }
          return null;
        })()}
        {isDeleted && (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
            <Check size={28} color={colors.income} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.category, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {/* 情绪文字徽标已按需求隐藏 */}
          </View>

          <View style={styles.amountWrap}>
            <AmountText
              value={formattedAmount}
              color={color}
              style={styles.amount}
              align="right"
            />
          </View>
        </View>

        <View style={styles.details}>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {transaction.description ?? ''}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]} numberOfLines={1}>
            {formatDateYYYYMMDD(new Date(transaction.date))}
          </Text>
        </View>
      </View>
      </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 12,
    // subtle shadow
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  emojiText: { fontSize: 22 },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0
  },
  // 类别占满剩余空间，单行省略，不被金额区域挤压
  category: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
    flexBasis: 'auto',
    overflow: 'hidden'
  },
  // 金额容器限定最大宽度，优先保留标题可见
  amountWrap: {
    maxWidth: 140,
    minWidth: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
    flexShrink: 0
  },
  // 金额文本自适应缩放，保持右对齐
  amount: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  description: { flex: 1, fontSize: 14, marginRight: 8 },
  date: { fontSize: 12 },
  emotionPill: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '40%',
    overflow: 'hidden',
  },
  emotionText: { fontSize: 12, fontWeight: '600' },




});