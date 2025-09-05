import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, TrendingUp, TrendingDown, Wallet, ArrowDown, ArrowUp } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionItem from '@/components/TransactionItem';
import { useTheme } from '@/contexts/ThemeContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import Fab from '@/components/ui/Fab';

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

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useLanguage();
  const { transactions, getMonthlyStatsByCurrency, getTopEmotionToday } = useTransactions();
  const { colors } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const monthlyStatsByCurrency = getMonthlyStatsByCurrency().sort((a, b) => a.firstAccountDate.getTime() - b.firstAccountDate.getTime());
  const recentTransactions = transactions.slice(0, 5);
  const topEmotion = getTopEmotionToday();

  const symbolOf = useCallback((code: string) => {
    return currencies.find(c => c.code === code)?.symbol || code;
  }, []);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const cardWidth = screenWidth - 32;
    const index = Math.round(scrollPosition / cardWidth);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    // 当关闭弹窗时，清除URL参数以防止热重载或返回时重新打开
    if (params.from === 'tab') {
      router.setParams({ showAddModal: undefined, from: undefined });
    }
  };

  useEffect(() => {
    // 监听来自标签栏按钮的参数
    if (params.showAddModal === 'true' && params.from === 'tab') {
      setShowAddModal(true);
    }
  }, [params]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader
        variant="emojiTicker"

        messageIntervalMs={6000}
        right={
          <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: 8 }}>
            <Settings size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 95 }}>
        <Card padding={16}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('home')}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{t('homeSubtitle')}</Text>
        </Card>

        {monthlyStatsByCurrency.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={monthlyStatsByCurrency}
              renderItem={({ item }) => (
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.cardBalanceLabel, { color: colors.textSecondary }]}>{t('monthlyBalance')} ({item.currency})</Text>
                  <Text style={[styles.cardBalanceValue, { color: colors.text }]}>
                    {symbolOf(item.currency)}{item.balance.toFixed(2)}
                  </Text>
                  <View style={[styles.cardRow, { borderTopColor: colors.border }]}>
                    <View style={styles.cardTile}>
                      <Text style={[styles.cardTileLabel, { color: colors.textSecondary }]}>{t('income')}</Text>
                      <Text style={[styles.cardTileValue, { color: colors.income }]}>{symbolOf(item.currency)}{item.income.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.cardTile, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
                      <Text style={[styles.cardTileLabel, { color: colors.textSecondary }]}>{t('expense')}</Text>
                      <Text style={[styles.cardTileValue, { color: colors.expense }]}>{symbolOf(item.currency)}{item.expense.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              keyExtractor={item => item.currency}
              decelerationRate="fast"
              snapToInterval={screenWidth - 32}
            />
            <View style={styles.pagination}>
              {monthlyStatsByCurrency.map((_, index) => (
                <View key={index} style={[styles.dot, activeIndex === index ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]} />
              ))}
            </View>
          </View>
        )}

        <Card padding={16}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('todayTopEmotion')}</Text>
          {topEmotion ? (
            <View style={{flexDirection:'row', alignItems:'center', gap:8, marginTop:8}}>
              <Text style={{fontSize:18}}>{topEmotion.emoji}</Text>
              <Text style={{fontSize:16, color: colors.text}}>
                {(() => { const s = t(topEmotion.name); return s && s !== '...' ? s : topEmotion.name; })()}
              </Text>
              <Text style={{marginLeft:'auto', fontWeight:'700', color: colors.textSecondary}}>{topEmotion.count} {t('spendTimes')}</Text>
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('noData')}</Text>
          )}
        </Card>

        <Card padding={16}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentTransactions')}</Text>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Wallet size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>{t('noTransactions')}</Text>
              <Text style={[styles.emptyStateSubText, { color: colors.textTertiary }]}>{t('addFirst')}</Text>
            </View>
          ) : (
            <FlatList
              data={recentTransactions}
              renderItem={({ item }) => <TransactionItem transaction={item} />}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Card>
      </ScrollView>

      <AddTransactionModal
        visible={showAddModal}
        onClose={handleCloseModal}
        autoFocusAmount={params.from === 'tab'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginVertical: 12,
    marginHorizontal: 16,
  },
  statCard: {
    width: screenWidth - 32,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cardBalanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardBalanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  cardTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cardTileLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  cardTileValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubText: {
    fontSize: 14,
    marginTop: 4,
  },
});