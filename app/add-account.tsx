import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, AccountType } from '@/contexts/TransactionContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { ChevronLeft, ChevronDown, Check, Wallet, Banknote, CreditCard, BadgeDollarSign, Smartphone, DollarSign, Euro, JapaneseYen, PoundSterling } from 'lucide-react-native';

const accountTypes = ['cash', 'debit_card', 'credit_card', 'prepaid_card', 'virtual_card'];

export default function AddAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { addAccount, accounts } = useTransactions();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [currency, setCurrency] = useState('CNY'); // Default currency
  const [creditLimit, setCreditLimit] = useState('');
  const currencyOptions = ['USD','EUR','JPY','GBP','CNY','AUD','CAD'] as const;
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // 仅允许数字与单个小数点的输入过滤
  const sanitizeDecimal = useCallback((text: string) => {
    if (!text) return '';
    let s = text.replace(/[^\d.]/g, '');
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
    }
    return s;
  }, []);

  const handleSave = () => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      Alert.alert(t('tip'), t('pleaseEnterName'));
      return;
    }

    // 名称唯一性（忽略大小写/空白）
    const duplicate = (accounts || []).some(a => (a.name || '').trim().toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) {
      Alert.alert(t('tip'), t('accountNameExists'));
      return;
    }

    // 初始余额必须是数字
    const ibNum = Number(initialBalance);
    const isIbNumeric = initialBalance.trim() !== '' && Number.isFinite(ibNum);
    if (!isIbNumeric) {
      Alert.alert(t('tip'), t('initialBalanceMustBeNumber'));
      return;
    }
    const ib = ibNum;

    if ((type === 'cash' || type === 'debit_card' || type === 'prepaid_card') && ib < 0) {
      Alert.alert(t('tip'), t('initialBalanceNonNegative'));
      return;
    }

    let cl: number | undefined = undefined;
    if (type === 'credit_card') {
      if (creditLimit && creditLimit.trim() !== '') {
        const v = Number(creditLimit);
        if (!Number.isFinite(v) || v <= 0) {
          Alert.alert(t('tip'), t('creditLimitMustBeNumber'));
          return;
        }
        cl = v;
      }
    }

    try {
      addAccount({
        name: trimmedName,
        type,
        initialBalance: ib,
        currency: currency as any,
        creditLimit: cl as any,
      });
      router.back();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg === 'INITIAL_BALANCE_NEGATIVE') {
        Alert.alert(t('tip'), t('initialBalanceNonNegative'));
      } else if (msg === 'ACCOUNT_NAME_DUPLICATE') {
        Alert.alert(t('tip'), t('accountNameExists'));
      } else {
        Alert.alert(t('tip'), t('operationFailed'));
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <GradientHeader
        title={t('addAccount')}
        left={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
        }
        shape="flat"
        centerTitle={true}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accountName')}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder={t('egSavingsAccount')}
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accountType')}</Text>
          <View style={[styles.filterRow, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setShowTypeModal(true)}
              style={[styles.dropdownBtn, { borderColor: colors.border }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                {type === 'cash' ? (
                  <Wallet size={18} color={colors.textSecondary} />
                ) : type === 'debit_card' ? (
                  <Banknote size={18} color={colors.textSecondary} />
                ) : type === 'credit_card' ? (
                  <CreditCard size={18} color={colors.textSecondary} />
                ) : type === 'prepaid_card' ? (
                  <BadgeDollarSign size={18} color={colors.textSecondary} />
                ) : (
                  <Smartphone size={18} color={colors.textSecondary} />
                )}
                <Text style={{ color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
                  {t(type) || type}
                </Text>
              </View>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Modal
            visible={showTypeModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTypeModal(false)}
          >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypeModal(false)}>
              <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
                {accountTypes.map(tp => {
                  const selected = type === (tp as AccountType);
                  return (
                    <TouchableOpacity
                      key={tp}
                      style={styles.optionRow}
                      onPress={() => { setType(tp as AccountType); setShowTypeModal(false); }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {tp === 'cash' ? (
                          <Wallet size={18} color={colors.textSecondary} />
                        ) : tp === 'debit_card' ? (
                          <Banknote size={18} color={colors.textSecondary} />
                        ) : tp === 'credit_card' ? (
                          <CreditCard size={18} color={colors.textSecondary} />
                        ) : tp === 'prepaid_card' ? (
                          <BadgeDollarSign size={18} color={colors.textSecondary} />
                        ) : (
                          <Smartphone size={18} color={colors.textSecondary} />
                        )}
                        <Text style={{ color: colors.text }} numberOfLines={1} ellipsizeMode="tail">{t(tp) || tp}</Text>
                      </View>
                      {selected && <Check size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>



          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('currency')}</Text>
          <View style={[styles.filterRow, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setShowCurrencyModal(true)}
              style={[styles.dropdownBtn, { borderColor: colors.border }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                {currency === 'EUR' ? (
                  <Euro size={18} color={colors.textSecondary} />
                ) : currency === 'JPY' || currency === 'CNY' ? (
                  <JapaneseYen size={18} color={colors.textSecondary} />
                ) : currency === 'GBP' ? (
                  <PoundSterling size={18} color={colors.textSecondary} />
                ) : (
                  <DollarSign size={18} color={colors.textSecondary} />
                )}
                <Text style={{ color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
                {currency}
              </Text>
              </View>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Modal
            visible={showCurrencyModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCurrencyModal(false)}
          >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyModal(false)}>
              <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
                {currencyOptions.map(code => {
                  const selected = currency === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      style={styles.optionRow}
                      onPress={() => { setCurrency(code as any); setShowCurrencyModal(false); }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {code === 'EUR' ? (
                          <Euro size={18} color={colors.textSecondary} />
                        ) : code === 'JPY' || code === 'CNY' ? (
                          <JapaneseYen size={18} color={colors.textSecondary} />
                        ) : code === 'GBP' ? (
                          <PoundSterling size={18} color={colors.textSecondary} />
                        ) : (
                          <DollarSign size={18} color={colors.textSecondary} />
                        )}
                        <Text style={{ color: colors.text }}>{code}</Text>
                      </View>
                      {selected && <Check size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('initialBalance')}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={initialBalance}
            onChangeText={(txt) => setInitialBalance(sanitizeDecimal(txt))}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
          {type === 'credit_card' && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('creditLimit')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={creditLimit}
                onChangeText={(txt) => setCreditLimit(sanitizeDecimal(txt))}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </>
          )}
        </Card>

        <PrimaryButton label={t('save')} onPress={handleSave} style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
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
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});