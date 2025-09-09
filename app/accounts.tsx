import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Account } from '@/contexts/TransactionContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';

import { ChevronLeft, Plus, ArrowLeftRight, ChevronDown, Check, Wallet, Banknote, CreditCard, BadgeDollarSign, Smartphone, DollarSign, Euro, JapaneseYen, PoundSterling } from 'lucide-react-native';

export default function AccountsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { accounts, getAccountBalance, archiveAccount } = useTransactions();

  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const currencyOptions = ['ALL','USD','EUR','JPY','GBP','CNY','AUD','CAD'] as const;

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const typeOptions = ['ALL','cash','debit_card','credit_card','prepaid_card','virtual_card'] as const;

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // 缓存筛选结果，避免每次渲染重复 filter
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a =>
      !a.archived &&
      (selectedCurrency === 'ALL' || a.currency === selectedCurrency) &&
      (selectedType === 'ALL' || a.type === selectedType)
    );
  }, [accounts, selectedCurrency, selectedType]);



  const renderAccountItem = ({ item }: { item: Account }) => {
    const balance = getAccountBalance(item.id);
    return (
      <Card style={styles.accountCard}>
        <View>
          <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.accountType, { color: colors.textSecondary }]}>{t(item.type) || item.type}</Text>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, { color: balance >= 0 ? colors.text : colors.expense }]}>
            {balance.toFixed(2)}
          </Text>
          <Text style={[styles.currency, { color: colors.textSecondary }]}>{item.currency}</Text>
          <TouchableOpacity
            onPress={async () => {
              if (Math.abs(balance) > 1e-8 || archivingId === item.id) return;
              try {
                setArchivingId(item.id);
                await Promise.resolve(archiveAccount(item.id));
              } catch (e) {
                Alert.alert(
                  t('operationFailed'),
                  t('balanceMustBeZeroToArchive')
                );
              } finally {
                setArchivingId(null);
              }
            }}
            disabled={Math.abs(balance) > 1e-8 || archivingId === item.id}
            style={{ marginTop: 6, opacity: (Math.abs(balance) <= 1e-8 && archivingId !== item.id) ? 1 : 0.5 }}
          >
            {archivingId === item.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ color: Math.abs(balance) <= 1e-8 ? colors.primary : colors.textTertiary, fontSize: 12 }}>
                {t('archive') as string}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <GradientHeader
        title={t('accountManagement') as string}
        left={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
        }
        shape="flat"
        height={61}
        centered={true}
        centerTitle={true}
      />
      {/* Filters */}
      <View style={[styles.filterRow, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => setShowTypeModal(true)}
          style={[styles.dropdownBtn, { borderColor: colors.border }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <Wallet size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
              {selectedType === 'ALL' ? (t('all') as string) : (t(selectedType) || selectedType)}
            </Text>
          </View>
          <ChevronDown size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowCurrencyModal(true)}
          style={[styles.dropdownBtn, { borderColor: colors.border }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            {selectedCurrency === 'ALL' ? (
              <Banknote size={18} color={colors.textSecondary} />
            ) : selectedCurrency === 'EUR' ? (
              <Euro size={18} color={colors.textSecondary} />
            ) : selectedCurrency === 'JPY' || selectedCurrency === 'CNY' ? (
              <JapaneseYen size={18} color={colors.textSecondary} />
            ) : selectedCurrency === 'GBP' ? (
              <PoundSterling size={18} color={colors.textSecondary} />
            ) : (
              <DollarSign size={18} color={colors.textSecondary} />
            )}
            <Text style={{ color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
              {selectedCurrency === 'ALL' ? (t('all') as string) : selectedCurrency}
            </Text>
          </View>
          <ChevronDown size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={() => router.push('/add-account')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '20', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 }}
        >
          <Plus size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('addAccount') as string}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/transfer')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '20', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 }}
        >
          <ArrowLeftRight size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('transfer') as string}</Text>
        </TouchableOpacity>
      </View>

      {/* Currency Modal */}
      <Modal visible={showCurrencyModal} transparent animationType="fade" onRequestClose={() => setShowCurrencyModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            {currencyOptions.map(code => {
              const selected = selectedCurrency === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={styles.optionRow}
                  onPress={() => { setSelectedCurrency(code as string); setShowCurrencyModal(false); }}
                >
                  <Text style={{ color: colors.text }}>
                    {code === 'ALL' ? (t('all') as string) : code}
                  </Text>
                  {selected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Type Modal */}
      <Modal visible={showTypeModal} transparent animationType="fade" onRequestClose={() => setShowTypeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypeModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            {typeOptions.map(tp => {
              const selected = selectedType === tp;
              return (
                <TouchableOpacity
                  key={tp}
                  style={styles.optionRow}
                  onPress={() => { setSelectedType(tp as string); setShowTypeModal(false); }}
                >
                  <Text style={{ color: colors.text }}>
                    {tp === 'ALL' ? (t('all') as string) : (t(tp) || tp)}
                  </Text>
                  {selected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        style={{ flex: 1 }}
        data={filteredAccounts}
        renderItem={renderAccountItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        extraData={archivingId}
        initialNumToRender={10}
        windowSize={5}
        removeClippedSubviews
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 8,
  },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    padding: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    fontSize: 12,
    marginTop: 4,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 18,
    fontWeight: '700',
  },
  currency: {
    fontSize: 12,
    marginTop: 4,
  },
});