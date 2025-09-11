import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
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
import IconButton from '@/components/ui/IconButton';
import { formatCurrency } from '@/lib/i18n';
import AmountText from '@/components/ui/AmountText';





export default function HomeScreen() {
  const { t } = useLanguage();
  const { transactions, getMonthlyStatsByCurrency, getTopEmotionToday } = useTransactions();
  const { colors } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const aligningRef = useRef(false);

  const monthlyStatsByCurrency = getMonthlyStatsByCurrency().sort((a, b) => a.firstAccountDate.getTime() - b.firstAccountDate.getTime());
  const recentTransactions = transactions.slice(0, 5);
  const topEmotion = getTopEmotionToday();



  const { width } = useWindowDimensions();
  const pageWidth = Math.max(100, (width || 0) - 32);

  const handleScroll = (event: any) => {
    if (aligningRef.current) return;
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / pageWidth);
    if (index !== activeIndex) setActiveIndex(index);
  };

  // 在折叠屏切换（width 变化）时，按当前索引对齐到新页宽，防止分页点偏移
  useEffect(() => {
    const ref = flatListRef.current as any;
    if (!ref) return;
    aligningRef.current = true;
    // 第一次对齐：下一帧，使用新 pageWidth
    requestAnimationFrame(() => {
      try {
        ref.scrollToOffset({ offset: activeIndex * pageWidth, animated: false });
      } catch {}
      // 第二次对齐：再等一小段时间，等布局/阴影/滚动条稳定
      setTimeout(() => {
        try {
          ref.scrollToOffset({ offset: activeIndex * pageWidth, animated: false });
        } catch {}
        aligningRef.current = false;
      }, 50);
    });
  }, [pageWidth]);

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
          <IconButton onPress={() => router.push('/settings')}>
            <Settings size={24} color="#fff" />
          </IconButton>
        }
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 95 }}>
        <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('home')}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{t('homeSubtitle')}</Text>
        </Card>

        {monthlyStatsByCurrency.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={monthlyStatsByCurrency}
              renderItem={({ item }) => (
                <View style={[styles.statCard, { backgroundColor: colors.surface, width: Math.max(100, (width || 0) - 32) }]}>
                  <Text style={[styles.cardBalanceLabel, { color: colors.textSecondary }]}>{t('monthlyBalance')} ({item.currency})</Text>
                  <AmountText
                    value={formatCurrency(item.balance, item.currency as any)}
                    color={colors.text}
                    style={styles.cardBalanceValue}
                    align="center"
                  />
                  <View style={[styles.cardRow, { borderTopColor: colors.border }]}>
                    <View style={styles.cardTile}>
                      <Text style={[styles.cardTileLabel, { color: colors.textSecondary }]}>{t('income')}</Text>
                      <AmountText
                        value={formatCurrency(item.income, item.currency as any)}
                        color={colors.income}
                        style={styles.cardTileValue}
                        align="center"
                      />
                    </View>
                    <View style={[styles.cardTile, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
                      <Text style={[styles.cardTileLabel, { color: colors.textSecondary }]}>{t('expense')}</Text>
                      <AmountText
                        value={formatCurrency(item.expense, item.currency as any)}
                        color={colors.expense}
                        style={styles.cardTileValue}
                        align="center"
                      />
                    </View>
                  </View>
                </View>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              keyExtractor={item => item.currency}
              getItemLayout={(_, index) => ({
                length: pageWidth,
                offset: pageWidth * index,
                index,
              })}
              decelerationRate="fast"
              snapToInterval={Math.max(100, (width || 0) - 32)}
              snapToAlignment="start"
              disableIntervalMomentum
            />
            <View style={styles.pagination}>
              {monthlyStatsByCurrency.map((_, index) => (
                <View key={index} style={[styles.dot, activeIndex === index ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]} />
              ))}
            </View>
          </View>
        )}

        <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
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

        <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
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
    maxWidth: 220,
    textAlign: 'center',
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
    maxWidth: 140,
    textAlign: 'center',
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