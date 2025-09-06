import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/contexts/LanguageContext';
import { Transaction, useTransactions } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Check } from 'lucide-react-native';

const currencies = [
  { code: 'CNY', name: '人民币', symbol: '¥' }, { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' }, { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }, { code: 'KRW', name: 'Korean Won', symbol: '₩' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' }, { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' }, { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' }, { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' }, { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' }, { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' }, { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' }, { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' }, { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' }, { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
];

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
  const { t } = useLanguage();
  const { deleteTransaction, getCurrencySymbol, emotions } = useTransactions();
  const { colors } = useTheme();

  const isIncome = transaction.type === 'income';
  const color = isIncome ? colors.income : colors.expense;
  
  const currencySymbol = React.useMemo(() => {
    const code = (transaction as any).currency;
    if (!code) return getCurrencySymbol();
    return currencies.find(c => c.code === code)?.symbol || code;
  }, [transaction, getCurrencySymbol]);

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
  // 当翻译缺失时避免显示为"..."，回退为原始分类名
  const translatedCategory = t(transaction.category);
  const title =
    !translatedCategory || translatedCategory === '...'
      ? (transaction.category || t('category'))
      : translatedCategory;

  const emoji = (() => {
    if (!transaction.emotion) return '🙂';
    const tag = emotions.find(e => e.name === transaction.emotion);
    return tag?.emoji || '🙂';
  })();







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
            <Text style={[styles.category, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
            {!!transaction.emotion && (
              <View style={[styles.emotionPill, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.emotionText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                  {(() => { const s = t(transaction.emotion); return s && s !== '...' ? s : transaction.emotion; })()}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.amount, { color }]} numberOfLines={1}>
            {currencySymbol}{Number(transaction.amount).toFixed(2)}
          </Text>
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
    flexShrink: 1,
  },
  category: { fontSize: 16, fontWeight: '600', maxWidth: '60%', flexShrink: 1 },
  amount: { fontSize: 16, fontWeight: '800', minWidth: 88, textAlign: 'right', flexShrink: 0, fontVariant: ['tabular-nums'] },
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