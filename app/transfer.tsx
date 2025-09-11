import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Account } from '@/contexts/TransactionContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { ChevronLeft, ChevronDown, Check, Wallet } from 'lucide-react-native';
import { getCurrencySymbol, formatCurrency } from '@/lib/i18n';

export default function TransferScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { accounts, addTransfer, getAccountBalance } = useTransactions();

  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [fee, setFee] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);

  const currencySymbol = useMemo(() => {
    const fromAcc = accounts.find(a => a.id === fromId);
    const code = fromAcc?.currency;
    return code ? getCurrencySymbol(code) : '';
  }, [fromId, accounts]);

  const validAccounts = useMemo(() => accounts, [accounts]);
  const fromAccount = useMemo(() => validAccounts.find(a => a.id === fromId), [validAccounts, fromId]);
  const toAccount = useMemo(() => validAccounts.find(a => a.id === toId), [validAccounts, toId]);

  const onSubmit = () => {
    try {
      const amt = parseFloat(amount) || 0;
      const feeNum = parseFloat(fee || '0') || 0;
      if (!fromId || !toId) {
        Alert.alert(t('selectAccount'), t('noAccountAvailableMessage'));
        return;
      }
      if (fromId === toId) {
        Alert.alert('Error', t('cannotTransferSameAccount'));
        return;
      }
      if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
        const detail = `${fromAccount.currency} \u2192 ${toAccount.currency}`;
        Alert.alert(
          t('transfer'),
          t('cannotTransferDifferentCurrency') + ` (${detail})`
        );
        return;
      }
      if (!amt || amt <= 0) {
        Alert.alert(t('amountInvalidTitle'), t('amountInvalidMessage'));
        return;
      }
      addTransfer(fromId, toId, amt, feeNum, new Date(), description);
      Alert.alert(t('transfer'), t('operationSuccess'));
      router.back();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg === 'INSUFFICIENT_FUNDS') {
        Alert.alert(t('transfer'), t('insufficientFunds'));
      } else if (msg === 'SAME_ACCOUNT') {
        Alert.alert(t('transfer'), t('cannotTransferSameAccount'));
      } else if (msg === 'INVALID_AMOUNT') {
        Alert.alert(t('amountInvalidTitle'), t('amountInvalidMessage'));
      } else if (msg === 'DIFFERENT_CURRENCY') {
        const detail = fromAccount && toAccount ? `${fromAccount.currency} \u2192 ${toAccount.currency}` : '';
        Alert.alert(t('transfer'), t('cannotTransferDifferentCurrency') + (detail ? ` (${detail})` : ''));
      } else if (msg === 'CREDIT_LIMIT_EXCEEDED') {
        Alert.alert(t('transfer'), t('creditLimitExceeded'));
      } else {
        Alert.alert(t('transfer'), t('operationFailed'));
      }
    }
  };

  const renderAccountOption = (a: Account, selectedId: string, onSelect: (id: string) => void) => {
    const selected = selectedId === a.id;
    const bal = getAccountBalance(a.id);
    return (
      <TouchableOpacity key={a.id} style={styles.optionRow} onPress={() => onSelect(a.id)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Wallet size={18} color={colors.textSecondary} />
          <Text style={{ color: colors.text }}>{a.name} · {a.currency} · {formatCurrency(bal, a.currency as any)}</Text>
        </View>
        {selected && <Check size={18} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <GradientHeader
        title={t('transfer')}
        left={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
        }
        shape="flat"
        centerTitle={true}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('fromAccount')}</Text>
          <TouchableOpacity onPress={() => setShowFromModal(true)} style={[styles.dropdownBtn, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <Wallet size={18} color={colors.textSecondary} />
              <Text style={{ color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
                {fromAccount ? `${fromAccount.name} (${fromAccount.currency})` : t('selectAccount')}
              </Text>
            </View>
            <ChevronDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('toAccount')}</Text>
          <TouchableOpacity onPress={() => setShowToModal(true)} style={[styles.dropdownBtn, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <Wallet size={18} color={colors.textSecondary} />
              <Text style={{ color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
                {toAccount ? `${toAccount.name} (${toAccount.currency})` : t('selectAccount')}
              </Text>
            </View>
            <ChevronDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('amount')}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={amount}
            onChangeText={setAmount}
            placeholder={fromAccount ? formatCurrency(0, fromAccount.currency as any) : '0.00'}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('fee')}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={fee}
            onChangeText={setFee}
            placeholder={fromAccount ? formatCurrency(0, fromAccount.currency as any) : '0.00'}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('description')}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('notePlaceholder') as string}
            placeholderTextColor={colors.textTertiary}
          />
        </Card>

        <PrimaryButton label={t('save')} onPress={onSubmit} style={{ marginTop: 24 }} />
      </ScrollView>

      {/* From Modal */}
      <Modal
        visible={showFromModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFromModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFromModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            {validAccounts.map(a => renderAccountOption(a, fromId, (id) => { setFromId(id); setShowFromModal(false); }))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* To Modal */}
      <Modal
        visible={showToModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowToModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowToModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            {validAccounts.map(a => renderAccountOption(a, toId, (id) => { setToId(id); setShowToModal(false); }))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  dropdownBtn: {
    alignSelf: 'stretch',
    flex: 1,
    minWidth: 0,
    width: '100%',
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
});