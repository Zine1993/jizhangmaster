import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Transaction } from '@/contexts/TransactionContext';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionItem from '@/components/TransactionItem';
import { useTheme } from '@/contexts/ThemeContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import Fab from '@/components/ui/Fab';

export default function HomeScreen() {
  const { t } = useLanguage();
  const { transactions, getMonthlyStats, getCurrencySymbol, getTopEmotion } = useTransactions();
  const { colors } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  const { income, expense, balance } = getMonthlyStats();
  const recentTransactions = transactions.slice(0, 5);
  const currencySymbol = getCurrencySymbol();
  const topEmotion = getTopEmotion();

  const Tile = ({
    title,
    amount,
    color,
  }: {
    title: string;
    amount: number;
    color: string;
  }) => (
    <View style={[styles.tile, { backgroundColor: `${color}15`, borderColor: colors.border }]}>
      <Text style={[styles.tileTitle, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.tileAmount, { color }]}>{currencySymbol}{amount.toFixed(2)}</Text>
    </View>
  );

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTransaction(undefined);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader variant="userInfo" />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Card padding={16}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('home')}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{t('homeSubtitle')}</Text>
        </Card>

        <Card>
          <View style={styles.balanceWrap}>
            <Text style={[styles.balanceText, { color: colors.text }]}>{t('balance')}</Text>
            <Text style={styles.balanceValue}>{currencySymbol}{balance.toFixed(2)}</Text>
          </View>
          <View style={styles.tilesRow}>
            <Tile title={t('totalIncome')} amount={income} color={colors.income} />
            <Tile title={t('totalExpense')} amount={expense} color={colors.expense} />
          </View>
        </Card>

        <Card padding={16}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('mainEmotion')}</Text>
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
              renderItem={({ item }) => <TransactionItem transaction={item} onEdit={handleEditTransaction} />}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Card>
      </ScrollView>

      <Fab onPress={() => { setEditingTransaction(undefined); setShowAddModal(true); }}>
        <Plus size={28} color="#fff" />
      </Fab>

      <AddTransactionModal
        visible={showAddModal}
        onClose={handleCloseModal}
        editTransaction={editingTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  balanceWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 14,
    opacity: 0.7,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 6,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  tile: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  tileAmount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
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