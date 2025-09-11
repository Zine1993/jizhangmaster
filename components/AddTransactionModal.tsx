import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, Transaction } from '@/contexts/TransactionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmotionTags } from '@/contexts/EmotionTagContext';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useEmojiRain } from '@/contexts/EmojiRainContext';
import { displayNameFor, getCurrencySymbol } from '@/lib/i18n';



interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  editTransaction?: Transaction;
  autoFocusAmount?: boolean;
}

const defaultExpenseCategoryNames = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'health',
  'education',
  'other',
];




export default function AddTransactionModal({ visible, onClose, editTransaction, autoFocusAmount }: AddTransactionModalProps) {
  const { t, language } = useLanguage();
  const { addTransaction, updateTransaction, getCurrencySymbolFor, /* emotions, */ accounts, getAccountBalance, expenseCategories: ctxExpenseCategories, incomeCategories: ctxIncomeCategories } = useTransactions();
  const { colors } = useTheme();
  const { triggerEmojiRain } = useEmojiRain();
  const { tagsMap, ready } = useEmotionTags();
  const tagNames = useMemo(() => Object.keys(tagsMap || {}), [tagsMap]);

  const expenseCategoryNames = useMemo(
    () => ((ctxExpenseCategories && ctxExpenseCategories.length)
      ? ctxExpenseCategories.map((c) => c.name)
      : defaultExpenseCategoryNames),
    [ctxExpenseCategories]
  );

  const incomeCategoryNames = useMemo(
    () => ((ctxIncomeCategories && ctxIncomeCategories.length)
      ? ctxIncomeCategories.map((c) => c.name)
      : ['salary', 'freelance', 'investment', 'other']),
    [ctxIncomeCategories]
  );

  const getListForType = useCallback(
    (t: 'income' | 'expense') => (t === 'expense' ? expenseCategoryNames : incomeCategoryNames),
    [expenseCategoryNames, incomeCategoryNames]
  );

  // 从 EmotionTagContext.tagsMap 生成可选情绪列表（以键为名称）
  const effectiveEmotions = useMemo(() => {
    const entries = Object.entries(tagsMap || {});
    if (!entries.length) {
      // 兜底一组基础情绪，避免空白
      return [
        { id: 'happy', name: '开心', emoji: '😄' },
        { id: 'reward', name: '奖励自己', emoji: '🎉' },
        { id: '平静', name: '平静', emoji: '😌' },
        { id: '焦虑', name: '焦虑', emoji: '😰' },
        { id: '沮丧', name: '沮丧', emoji: '😔' },
      ];
    }
    return entries.map(([name, res]) => {
      const emoji = res?.type === 'emoji' ? String(res.value) : '🙂';
      return { id: name, name, emoji };
    });
  }, [tagsMap]);
  
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [emotion, setEmotion] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');

  const isEditing = !!editTransaction;
  const scrollRef = useRef<any>(null);

  const selectedAccount = useMemo(() => {
    return accounts?.find(a => a.id === accountId);
  }, [accountId, accounts]);

  const currencySymbol = useMemo(() => {
    // 优先用所选账户币种，统一用标准符号（USD -> $）
    return getCurrencySymbolFor({ accountId, currency: selectedAccount?.currency });
  }, [accountId, selectedAccount?.currency, getCurrencySymbolFor]);

  useEffect(() => {
    if (editTransaction && visible) {
      setType(editTransaction.type);
      setAmount(String(editTransaction.amount));
      setCategory(editTransaction.category);
      setDescription(editTransaction.description || '');
      setEmotion(editTransaction.emotion || '');
      setAccountId((editTransaction as any).accountId || '');
    } else if (!editTransaction && visible) {
      setType('expense');
      setAmount('');
      setCategory(getListForType('expense')[0]);
      setDescription('');
      // 等待情绪标签准备好后再设置默认选项
      const firstEmotion = effectiveEmotions[0]?.name || '';
      setEmotion(firstEmotion);
      if (!accountId) setAccountId((accounts?.[0]?.id) || '');
    }
  }, [editTransaction, visible]);
  // ready 切换后，若当前 emotion 不在 tagsMap，则重设为第一项，避免 fallback 残留
  useEffect(() => {
    if (!visible) return;
    if (!ready) return;
    if (tagNames.length === 0) return;
    setEmotion((prev) => (prev && tagNames.includes(prev)) ? prev : tagNames[0]);
  }, [ready, tagNames, visible]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        try {
          scrollRef.current?.scrollTo?.({ y: 0, animated: false });
        } catch {}
      }, 0);
    }
  }, [visible]);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount)) || parseFloat(amount) <= 0) {
      const title = t('amountInvalidTitle') as string;
      const msg = t('amountInvalidMessage') as string;
      Alert.alert(title, msg);
      return;
    }

    if (!emotion || emotion.trim() === '') {
      const et = t('emotionRequiredTitle') as string;
      const em = t('emotionRequiredMessage') as string;
      Alert.alert(et, em);
      return;
    }

    const finalAccountId = accountId || accounts?.[0]?.id;
    if (!finalAccountId) {
      Alert.alert(t('noAccountAvailableTitle'), t('noAccountAvailableMessage'));
      return;
    }
    const finalAccount = accounts?.find(a => a.id === finalAccountId);
    if (!finalAccount) {
      // This should not happen if logic is correct
      Alert.alert(t('operationFailed'), '');
      return;
    }

    const list = getListForType(type);
    const safeCategory = (category && list.includes(category)) ? category : list[0];

    // 余额不能为负校验：现金/借记卡/预存卡，支出不得导致余额为负
    if (type === 'expense' && finalAccount && ['cash','debit_card','prepaid_card'].includes(finalAccount.type)) {
      const available = getAccountBalance(finalAccountId);
      if (available < parseFloat(amount) - 1e-8) {
        Alert.alert(t('insufficientFunds'));
        return;
      }
    }

    const tx: Omit<Transaction, 'id'> = {
      type,
      amount: parseFloat(amount),
      category: safeCategory,
      description: description.trim(),
      date: new Date(),
      emotion: emotion || '',
      accountId: finalAccountId,
      // @ts-ignore
      currency: finalAccount.currency,
    };

    if (isEditing && editTransaction) {
      updateTransaction(editTransaction.id, tx);
    } else {
      try {
        addTransaction(tx);
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (msg === 'INSUFFICIENT_FUNDS' || msg === 'CREDIT_LIMIT_EXCEEDED') {
          Alert.alert(t('insufficientFunds'));
          return;
        }
        Alert.alert(t('operationFailed'), msg);
        return;
      }
      // 触发表情雨：优先从 tagsMap 找资源
      const res = (tagsMap || {})[emotion || ''];
      const emojiChar = res && res.type === 'emoji' ? String(res.value) : (effectiveEmotions.find(e => e.name === (emotion || ''))?.emoji) || '🙂';
      triggerEmojiRain(emojiChar, { count: 16, duration: 3000, size: 28 });
    }
    setType('expense');
    setAmount('');
    setCategory(getListForType('expense')[0]);
    setDescription('');
    setEmotion(effectiveEmotions[0]?.name || '');
    onClose();
  };

  const TypeButton = ({
    transactionType,
    label,
    color,
  }: {
    transactionType: 'income' | 'expense';
    label: string;
    color: string;
  }) => (
    <TouchableOpacity activeOpacity={0.8}
      style={[
        styles.typeButton,
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
        type === transactionType && { backgroundColor: color, borderColor: color },
      ]}
      onPress={() => {
        setType(transactionType);
        const list = getListForType(transactionType);
        setCategory((prev) => (list.includes(prev) ? prev : list[0]));
      }}
    >
      <Text
        style={[
          styles.typeButtonText,
          { color: colors.textSecondary },
          type === transactionType && { color: '#FFFFFF' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const CategoryButton = ({ categoryKey }: { categoryKey: string }) => (
    <TouchableOpacity activeOpacity={0.8}
      style={[
        styles.categoryButton,
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
        category === categoryKey && { backgroundColor: colors.primary + '22', borderColor: colors.primary },
      ]}
      onPress={() => setCategory(categoryKey)}
    >
      <Text
        style={[
          styles.categoryButtonText,
          { color: colors.textSecondary },
          category === categoryKey && { color: colors.primary, fontWeight: '600' },
        ]}
      >
        {displayNameFor({ id: categoryKey, name: categoryKey }, type === 'income' ? 'incomeCategories' : 'expenseCategories', t as any, language as any)}
      </Text>
    </TouchableOpacity>
  );

  const ExpenseCategoryButton = ({ item }: { item: { name: string; emoji?: string } }) => (
    <TouchableOpacity activeOpacity={0.8}
      style={[
        styles.categoryButton,
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
        category === item.name && { backgroundColor: colors.primary + '22', borderColor: colors.primary },
      ]}
      onPress={() => setCategory(item.name)}
    >
      <Text
        style={[
          styles.categoryButtonText,
          { color: colors.textSecondary },
          category === item.name && { color: colors.primary, fontWeight: '600' },
        ]}
      >
        {(item.emoji ? item.emoji + ' ' : '') + displayNameFor(item as any, type === 'income' ? 'incomeCategories' : 'expenseCategories', t as any, language as any)}
      </Text>
    </TouchableOpacity>
  );

  const EmotionTag = ({ id, name, emoji }: { id: string; name: string; emoji: string }) => (
    <TouchableOpacity activeOpacity={0.8}
      style={[
        styles.emotionTag,
        { borderColor: colors.border, backgroundColor: colors.inputBackground },
        emotion === name && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
      ]}
      onPress={() => setEmotion(name)}
    >
      <Text style={{ fontSize: 16, marginRight: 6 }}>{emoji}</Text>
      <Text style={{ color: emotion === name ? colors.primary : colors.text }}>
        {displayNameFor({ id, name }, 'emotions', t as any, language as any)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.modalBackground }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditing ? t('editTransaction') : t('addTransaction')}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('transactionType')}</Text>
            <View style={styles.typeContainer}>
              <TypeButton transactionType="expense" label={t('expense')} color={colors.expense} />
              <TypeButton transactionType="income" label={t('income')} color={colors.income} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('account')}</Text>
            <View style={styles.emotionContainer}>
              {(accounts || []).map((a) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={a.id}
                  style={[
                    styles.emotionTag,
                    { borderColor: colors.border, backgroundColor: colors.inputBackground },
                    accountId === a.id && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                  ]}
                  onPress={() => setAccountId(a.id)}
                >
                  <Text style={{ color: accountId === a.id ? colors.primary : colors.text }}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('amount')}</Text>
            <View style={[styles.amountContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{currencySymbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                autoFocus={!!autoFocusAmount}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('category')}</Text>
            <View style={styles.categoryContainer}>
              {(type === 'expense' && ctxExpenseCategories && ctxExpenseCategories.length)
                ? ctxExpenseCategories.map((it: { id: string; name: string; emoji?: string }) => (
                    <ExpenseCategoryButton key={it.id} item={it} />
                  ))
                : (type === 'income' && ctxIncomeCategories && ctxIncomeCategories.length)
                ? ctxIncomeCategories.map((it: { id: string; name: string; emoji?: string }) => (
                    <ExpenseCategoryButton key={it.id} item={it} />
                  ))
                : getListForType(type).map((cat: string) => (
                    <CategoryButton key={cat} categoryKey={cat} />
                  ))
              }
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('currentEmotion')}</Text>
            {!ready ? (
              <Text style={{ color: colors.textTertiary, marginTop: 6, fontSize: 12 }}>
                {t('loading') || '加载中…'}
              </Text>
            ) : (
              <View style={styles.emotionContainer}>
                {effectiveEmotions.map((e) => (
                  <EmotionTag key={e.id} id={e.id} name={e.name} emoji={e.emoji} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('description')}</Text>
            <TextInput
              style={[styles.descriptionInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('notePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity activeOpacity={0.8} style={[styles.cancelButton, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={isEditing ? t('update') : t('save')} onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  placeholder: { width: 40 },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  typeContainer: { flexDirection: 'row', gap: 12 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: { fontSize: 16, fontWeight: '600' },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  currencySymbol: { fontSize: 18, fontWeight: '600', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  categoryButtonText: { fontSize: 14, fontWeight: '500' },
  emotionContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotionTag: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  descriptionInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, fontSize: 16, textAlignVertical: 'top', minHeight: 80 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '500' },
});