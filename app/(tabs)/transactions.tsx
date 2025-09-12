import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Settings } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Transaction } from '@/contexts/TransactionContext';

import TransactionItem from '@/components/TransactionItem';
import { formatCurrency } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import Fab from '@/components/ui/Fab';
import IconButton from '@/components/ui/IconButton';

export default function TransactionsScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { transactions } = useTransactions();
  const { colors } = useTheme();

  // FlatList 引用与选中日期
  const listRef = useRef<FlatList>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  // 在日历中暂存用户点击的日期，待“确定”后再跳转
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    // 默认显示最近一组有数据的月份
    const first = new Date();
    return first;
  });


  // 生成稳定的日期key（YYYY-MM-DD），同时提供显示用标题（今天/昨天/本地化）
  const sections = useMemo(() => {
    const today = new Date();
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);

    const map = new Map<string, { title: string; data: typeof transactions; totals: { income: number; expense: number; balance: number; currency?: string } }>();
    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let title = d.toLocaleDateString();
      if (d.toDateString() === today.toDateString()) title = t('today');
      else if (d.toDateString() === yest.toDateString()) title = t('yesterday');

      if (!map.has(key)) {
        map.set(key, {
          title,
          data: [] as typeof transactions,
          totals: { income: 0, expense: 0, balance: 0, currency: tx.currency },
        });
      }
      const bucket = map.get(key)!;
      bucket.data.push(tx);
      if (tx.type === 'income') bucket.totals.income += tx.amount;
      else if (tx.type === 'expense') bucket.totals.expense += tx.amount;
      bucket.totals.balance = bucket.totals.income - bucket.totals.expense;
    }
    // 按日期倒序（最近在上）
    const arr = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dateKey, v]) => ({ dateKey, title: v.title, data: v.data, totals: v.totals }));
    return arr;
  }, [transactions, t]);





  const renderSectionHeader = (dateKey: string, title: string, index: number) => (
    <Pressable
      onPress={() => {
        setSelectedDate(dateKey);
        setPickerVisible(true);
      }}
      android_ripple={{ color: '#00000014' }}
      style={[styles.sectionHeader, { backgroundColor: colors.sectionBackground }]}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
    </Pressable>
  );

  const renderSection = ({ item: section, index }: { item: typeof sections[0]; index: number }) => (
    <View>
      <Card padding={16} style={{ marginTop: 16, marginHorizontal: 16 }}>
        <View style={{ marginBottom: 16 }}>
          <View style={[styles.sectionHeader, { gap: 8 }]}>
            <Pressable
              onPress={() => {
                setSelectedDate(section.dateKey);
                setPickerVisible(true);
              }}
              android_ripple={{ color: '#00000014' }}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          {section.data.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </View>


      </Card>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} >
      <GradientHeader
        variant="emojiTicker"
        right={
          <IconButton onPress={() => router.push('/settings')}>
            <Settings size={24} color="#fff" />
          </IconButton>
        }
      />
      <Card padding={16} style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('transactions')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{t('recordsSubtitle')}</Text>
      </Card>
      {transactions.length === 0 ? (
        <View>
          <View style={styles.emptyState}>
            <Search size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>{t('noTransactions')}</Text>
            <Text style={[styles.emptyStateSubText, { color: colors.textTertiary }]}>{t('addFirst')}</Text>
          </View>
        </View>
      ) : (
        <>
          {/* 全局筛选入口：列表外面，标题卡片下方右侧 */}
          <View style={{ paddingHorizontal: 16, marginTop: 8, alignItems: 'flex-end' }}>
            <Pressable
              onPress={() => {
                const now = new Date();
                setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const hasToday = sections.some(s => s.dateKey === todayKey);
                setSelectedDate(hasToday ? todayKey : sections[0]?.dateKey || null);
                // 初始 pendingDate 显示为选中（若可选）
                setPendingDate(hasToday ? todayKey : null);
                setPickerVisible(true);
              }}
              android_ripple={{ color: '#00000014' }}
              style={[
                styles.filterPill,
                { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: Math.round(require('react-native').Dimensions.get('window').width * 0.42) }
              ]}
            >
              <Text style={styles.filterPillText}>🗓</Text>
              <Text
                style={styles.filterPillText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                allowFontScaling
              >
                {t('customRange') || '选择日期'}
              </Text>
            </Pressable>
          </View>

          <FlatList
            ref={listRef}
            data={sections}
            renderItem={renderSection}
            keyExtractor={(item) => item.dateKey}
            contentContainerStyle={{ paddingBottom: 95, paddingTop: 12 }}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}


      {/* 日期选择器（仅显示有数据的日期） */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalMask}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            {/* 日历头部：月份与切换 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(calendarMonth);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarMonth(d);
                }}
                style={{ padding: 8 }}
              >
                <Text style={{ color: colors.text }}>{'‹'}</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(calendarMonth);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarMonth(d);
                }}
                style={{ padding: 8 }}
              >
                <Text style={{ color: colors.text }}>{'›'}</Text>
              </TouchableOpacity>
            </View>

            {/* 星期标题 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              {['日','一','二','三','四','五','六'].map((w) => (
                <Text key={w} style={{ width: `${100/7}%`, textAlign: 'center', color: colors.textSecondary, fontSize: 12 }}>{w}</Text>
              ))}
            </View>

            {/* 构建有数据日期集合 */}
            {(() => {
              const available = new Set(sections.map(s => s.dateKey)); // YYYY-MM-DD
              // 计算“今日”用于默认高亮
              const now = new Date();
              const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

              const y = calendarMonth.getFullYear();
              const m = calendarMonth.getMonth();
              const first = new Date(y, m, 1);
              const startWeekday = first.getDay(); // 0..6
              const daysInMonth = new Date(y, m + 1, 0).getDate();

              const cells: { key: string; label: string; dateKey?: string; disabled?: boolean }[] = [];

              // 前置空白
              for (let i = 0; i < startWeekday; i++) {
                cells.push({ key: `empty-${i}`, label: '' });
              }
              // 本月日期
              for (let d = 1; d <= daysInMonth; d++) {
                const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const enabled = available.has(dateKey);
                cells.push({
                  key: dateKey,
                  label: String(d),
                  dateKey,
                  disabled: !enabled,
                });
              }

              const rows: typeof cells[] = [];
              for (let i = 0; i < cells.length; i += 7) {
                rows.push(cells.slice(i, i + 7));
              }

              return (
                <View>
                  {rows.map((row, rIdx) => (
                    <View key={`row-${rIdx}`} style={{ flexDirection: 'row' }}>
                      {row.map(cell => (
                        <TouchableOpacity
                          key={cell.key}
                          disabled={!cell.dateKey || cell.disabled}
                          onPress={() => {
                            if (!cell.dateKey || cell.disabled) return;
                            // 仅暂存选择，高亮，等待用户点击“确定”
                            setPendingDate(cell.dateKey);
                          }}
                          style={{
                            width: `${100/7}%`,
                            aspectRatio: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                            marginVertical: 2,
                            backgroundColor:
                              cell.dateKey && !cell.disabled && (cell.dateKey === pendingDate)
                                ? '#EDE9FE'
                                : (cell.dateKey === todayKey && !cell.disabled && !pendingDate ? '#F4F1FF' : 'transparent'),
                          }}
                        >
                          <Text style={{
                            color: !cell.dateKey
                              ? 'transparent'
                              : (cell.disabled ? colors.textTertiary : (cell.dateKey === pendingDate ? '#7C3AED' : colors.text)),
                            fontWeight: cell.dateKey === pendingDate && !cell.disabled ? '700' as const : '500' as const,
                          }}>
                            {cell.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })()}

            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: colors.textSecondary }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!pendingDate}
                onPress={() => {
                  if (!pendingDate) return;
                  setPickerVisible(false);
                  const targetIndex = sections.findIndex((x) => x.dateKey === pendingDate);
                  if (targetIndex >= 0) {
                    setTimeout(() => {
                      listRef.current?.scrollToIndex({ index: targetIndex, animated: true });
                    }, 10);
                  }
                }}
                style={[styles.modalConfirmBtn, { opacity: pendingDate ? 1 : 0.5 }]}
              >
                <Text style={{ color: '#7C3AED', fontWeight: '700' }}>{t('confirm') || '确定'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  dateItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000014',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  modalConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterPill: {
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  filterPillText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '600',
  },
});