import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientHeader from '@/components/ui/GradientHeader';
import { ChevronLeft, Plus, Trash2, Pencil, ChevronDown, Check } from 'lucide-react-native';
import { formatCurrency } from '@/lib/i18n';
import DateRangePicker from '@/components/ui/DateRangePicker';
const getSymbol = (code?: string) => {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'JPY': return '¥';
    case 'GBP': return '£';
    case 'CNY': return '¥';
    case 'AUD': return '$';
    case 'CAD': return '$';
    default: return '';
  }
};
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTransactions } from '@/contexts/TransactionContext';


type Budget = {
  id: string;
  name: string;
  currency: string;
  amount: number;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;   // ISO yyyy-mm-dd
  enabled: boolean;
};

const STORAGE_KEY = '@budgets_v1';

function fmtDateISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateOnly(dateStr: string) {
  // safe parse
  const [y, m, d] = (dateStr || '').split('-').map((x) => parseInt(x, 10));
  const dd = new Date(Number.isFinite(y) ? y : 1970, (Number.isFinite(m) ? m : 1) - 1, Number.isFinite(d) ? d : 1);
  dd.setHours(0, 0, 0, 0);
  return dd;
}

function overlapsExactly(a: Budget, b: Budget) {
  // “完全重合”：起止日期均相同且币种相同；若任一为空币种，则仅校验日期
  const sameCurrency = a.currency && b.currency ? a.currency === b.currency : true;
  return sameCurrency && a.startDate === b.startDate && a.endDate === b.endDate;
}



export default function BudgetsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { transactions, currency: globalCurrency } = useTransactions();

  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [loading, setLoading] = React.useState(true);

  // editor state
  const [showEditor, setShowEditor] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  // default currency: follow app-wide default; fallback to 'CNY'
  const [currency, setCurrency] = React.useState('CNY');
  const [amount, setAmount] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState<string>(fmtDateISO(new Date()));
  const [endDate, setEndDate] = React.useState<string>(fmtDateISO(new Date()));
  const [showStartSheet, setShowStartSheet] = React.useState(false);
  const [showEndSheet, setShowEndSheet] = React.useState(false);
  // Currency modal (consistent with Accounts)
  const [showCurrencyModal, setShowCurrencyModal] = React.useState(false);
  // Use the same date range picker as Stats
  const [showPeriodPicker, setShowPeriodPicker] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) { setBudgets([]); return; }
      const arr: Budget[] = JSON.parse(raw);
      setBudgets(Array.isArray(arr) ? arr : []);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = React.useCallback(async (next: Budget[]) => {
    setBudgets(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const getAppDefaultCurrency = React.useCallback(async (): Promise<string> => {
    // 1) try settings storage
    try {
      const s = await AsyncStorage.getItem('@settings.defaultCurrency');
      if (s) return s;
    } catch {}
    // 2) try first account currency from persisted accounts if exists
    try {
      const accRaw = await AsyncStorage.getItem('@accounts_v1');
      if (accRaw) {
        const arr = JSON.parse(accRaw) as Array<{ currency?: string }>;
        const code = Array.isArray(arr) && arr[0]?.currency;
        if (code) return code;
      }
    } catch {}
    // 3) fallback
    return 'CNY';
  }, []);

  const resetEditor = async () => {
    setEditingId(null);
    setName('');
    setAmount('');
    const today = fmtDateISO(new Date());
    setStartDate(today);
    setEndDate(today);
    // set default currency from app settings
    const def = await getAppDefaultCurrency();
    setCurrency(def || 'CNY');
  };

  const openCreate = () => {
    resetEditor();
    setShowEditor(true);
  };

  const openEdit = (b: Budget) => {
    setEditingId(b.id);
    setName(b.name);
    setCurrency(b.currency);
    setAmount(String(b.amount));
    setStartDate(b.startDate);
    setEndDate(b.endDate);
    setShowEditor(true);
  };

  const remove = (id: string) => {
    Alert.alert(String(t('confirm')), String(t('deleteConfirm')).replace('{name}', ''), [
      { text: String(t('cancel')), style: 'cancel' },
      { text: String(t('delete')), style: 'destructive', onPress: () => {
        const next = budgets.filter(b => b.id !== id);
        persist(next);
      } }
    ]);
  };

  const save = () => {
    const amt = Number(amount);
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) {
      Alert.alert(String(t('tip')), String(t('fillAllFields')));
      return;
    }
    const s = dateOnly(startDate);
    const e = dateOnly(endDate);
    if (s.getTime() > e.getTime()) {
      Alert.alert(String(t('tip')), String(t('startDate')) + ' <= ' + String(t('endDate')));
      return;
    }
    const draft: Budget = {
      id: editingId || 'b_' + Math.random().toString(36).slice(2, 9),
      name: name.trim(),
      currency,
      amount: amt,
      startDate,
      endDate,
      enabled: true,
    };
    // 校验完全重合（同币种、起止完全一致）
    const conflict = budgets.some(b => b.id !== draft.id && overlapsExactly(b, draft));
    if (conflict) {
      Alert.alert(String(t('tip')), String(t('budgetExactOverlapNotAllowed') as any));
      return;
    }
    let next: Budget[];
    if (editingId) {
      next = budgets.map(b => b.id === editingId ? draft : b);
    } else {
      next = [draft, ...budgets];
    }
    persist(next);
    setShowEditor(false);
  };

  const renderItem = ({ item }: { item: Budget }) => {
    return (
      <View style={[styles.item, { borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 12 }}>
            {item.startDate} ~ {item.endDate}
          </Text>
          {/* 预算完成度进度条与说明（使用全局 transactions 实时计算） */}
          {(() => {
            const bs = new Date(item.startDate);
            const be = new Date(item.endDate);
            const s = new Date(bs.getFullYear(), bs.getMonth(), bs.getDate(), 0, 0, 0, 0);
            const e = new Date(be.getFullYear(), be.getMonth(), be.getDate(), 23, 59, 59, 999);
            const budgetCurrency = item.currency || globalCurrency;
            let spent = 0;
            for (const tx of transactions) {
              if (tx.type !== 'expense') continue;
              const tc = ((tx as any).currency || '') as string;
              if (budgetCurrency && tc && tc !== budgetCurrency) continue;
              const td = new Date(tx.date);
              if (td >= s && td <= e) spent += tx.amount;
            }
            const total = Number(item.amount) || 0;
            const percentNum = total > 0 ? (spent / total) * 100 : 0;
            const percent = Math.round(Math.min(100, Math.max(0, percentNum)));
            const over = total > 0 && spent > total;
            const barColor = over ? colors.expense : percent >= 80 ? '#F59E0B' : colors.primary;

            return (
              <>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden', marginTop: 6 }}>
                  <View style={{ width: `${percent}%`, height: '100%', backgroundColor: barColor }} />
                </View>
                <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {formatCurrency(spent, budgetCurrency as any)} / {formatCurrency(total, budgetCurrency as any)}
                  </Text>
                  {over ? (
                    <Text style={{ color: colors.expense, fontSize: 12, fontWeight: '600' }}>已超支</Text>
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{percent}%</Text>
                  )}
                </View>
              </>
            );
          })()}
        </View>

        {/* 预算不可编辑：移除编辑入口，仅保留删除 */}
        {/* <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 8 }}>
          <Pencil size={18} color={colors.textSecondary} />
        </TouchableOpacity> */}
        <TouchableOpacity onPress={() => remove(item.id)} style={{ padding: 8 }}>
          <Trash2 size={18} color={colors.expense} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <GradientHeader
        title={t('budgetSettings')}
        left={
          <View style={{ padding: 8 }}>
            <ChevronLeft size={28} color="#fff" onPress={() => router.back()} />
          </View>
        }
        right={
          <TouchableOpacity onPress={openCreate} style={{ padding: 8 }}>
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        }
        shape="flat"
        height={61}
        centered
        centerTitle
      />
      <View style={{ flex: 1, padding: 16 }}>
        {loading ? (
          <Text style={{ color: colors.textSecondary }}>{t('loading') || 'Loading...'}</Text>
        ) : budgets.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>{t('noData')}</Text>
          </View>
        ) : (
          <FlatList
            data={budgets}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 6 }} />}
          />
        )}
        <TouchableOpacity
          onPress={openCreate}
          activeOpacity={0.9}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary
          }}
        >
          <Plus size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={showEditor} animationType="fade" onRequestClose={() => setShowEditor(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t(editingId ? 'budget.editTitle' : 'budget.addTitle')}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('budget.name') || 'Budget Name'}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t?.('budget.namePlaceholder') || 'e.g. My Budget'}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('currency')}</Text>
            <TouchableOpacity
              onPress={() => setShowCurrencyModal(true)}
              style={[styles.selectTrigger, { borderColor: colors.border, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              accessibilityRole="button"
              accessibilityLabel={String(t('selectCurrency') || 'Select currency')}
            >
              <Text style={{ color: currency ? colors.text : colors.textSecondary }}>
                {currency ? `${getSymbol(currency)} ${currency}` : (t('selectCurrency') || '选择货币')}
              </Text>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('amount') || 'Amount'}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('budget.period')}</Text>
            <TouchableOpacity
              onPress={() => setShowPeriodPicker(true)}
              style={[styles.datePickerTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Text style={{ color: colors.text }}>{startDate} ~ {endDate}</Text>
            </TouchableOpacity>

            {/* Use shared DateRangePicker to ensure identical UX with Stats */}
            <DateRangePicker
              visible={showPeriodPicker}
              onClose={() => setShowPeriodPicker(false)}
              initialStartDate={new Date(startDate)}
              initialEndDate={new Date(endDate)}
              onApply={({ start, end, label }: any) => {
                const fmt = (d: Date) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${y}-${m}-${day}`;
                };
                setStartDate(fmt(start));
                setEndDate(fmt(end));
                setShowPeriodPicker(false);
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowEditor(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: colors.textSecondary }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} style={[styles.primaryBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Modal (moved out of list, top-level to avoid z-index issues) */}
      <Modal visible={showCurrencyModal} transparent animationType="fade" onRequestClose={() => setShowCurrencyModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            {['ALL','USD','EUR','JPY','GBP','CNY','AUD','CAD'].map(code => {
              const selected = (currency || 'ALL') === code;
              const label = code === 'ALL' ? (t('all') as string) : `${getSymbol(code)} ${code}`;
              return (
                <TouchableOpacity
                  key={code}
                  style={styles.optionRow}
                  onPress={() => { if (code === 'ALL') { setCurrency(''); } else { setCurrency(code); } setShowCurrencyModal(false); }}
                >
                  <Text style={{ color: colors.text }}>
                    {label}
                  </Text>
                  {selected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  // Bottom sheet overlay like Accounts
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#00000020',
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000020',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 6,
  },
  datePickerTrigger: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 6,
  },
  selectTrigger: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 6,
  },
  label: {
    marginTop: 8,
    fontSize: 12,
  },
  primaryBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});