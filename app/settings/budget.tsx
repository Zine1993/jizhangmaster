import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import IconButton from '@/components/ui/IconButton';
import { Trash2, ArrowLeft, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { formatCurrency } from '@/lib/i18n';

type Budget = {
  id: string;
  name: string;
  currency?: string;
  amount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  enabled?: boolean;
};

export default function BudgetSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { transactions } = useTransactions();

  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadBudgets = React.useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem('@budgets_v1');
      const arr = raw ? (JSON.parse(raw) as Budget[]) : [];
      const list = Array.isArray(arr) ? arr : [];
      setBudgets(list);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const removeBudget = React.useCallback(async (id: string) => {
    try {
      const next = budgets.filter(b => b.id !== id);
      await AsyncStorage.setItem('@budgets_v1', JSON.stringify(next));
      setBudgets(next);
    } catch {
      // ignore
    }
  }, [budgets]);

  const confirmDelete = (b: Budget) => {
    Alert.alert(
      t('confirm') || '确认删除',
      (t('deleteBudgetConfirm') as any) || `确定删除预算“${b.name}”？此操作不可恢复`,
      [
        { text: t('cancel') || '取消', style: 'cancel' },
        { text: t('delete') || '删除', style: 'destructive', onPress: () => removeBudget(b.id) },
      ]
    );
  };

  // 计算预算进度（与当前日期交集）
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  function calcSpentForBudget(b: Budget) {
    const bs = new Date(b.startDate);
    const be = new Date(b.endDate);
    // 仅展示进度：按预算自身区间计算花费（不过滤统计页区间）
    const s = startOf(bs);
    const e = endOf(be);
    const expenseCurrency = (b.currency as any) || undefined;
    let sum = 0;
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if (expenseCurrency && (t as any).currency && (t as any).currency !== expenseCurrency) continue;
      const td = new Date(t.date);
      if (td >= s && td <= e) sum += t.amount;
    }
    return sum;
  }

  // 分组
  const groups = React.useMemo(() => {
    const now = startOf(today);
    const ongoing: Budget[] = [];
    const upcoming: Budget[] = [];
    const ended: Budget[] = [];
    for (const b of budgets) {
      const enabled = (b.enabled ?? true);
      if (!enabled) continue;
      const bs = startOf(new Date(b.startDate));
      const be = endOf(new Date(b.endDate));
      if (be < now) ended.push(b);
      else if (bs > now) upcoming.push(b);
      else ongoing.push(b);
    }
    // 保持原序
    return { ongoing, upcoming, ended };
  }, [budgets]);

  const Section = ({ title, data }: { title: string; data: Budget[] }) => {
    if (!data || data.length === 0) return null;
    return (
      <Card padding={16}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          <Chip label={`${data.length}`} selected={false} />
        </View>
        {data.map(b => {
          const spent = calcSpentForBudget(b);
          const total = Number(b.amount) || 0;
          const percentNum = total > 0 ? (spent / total) * 100 : 0;
          const percent = Math.round(Math.min(100, Math.max(0, percentNum)));
          const over = total > 0 && spent > total;
          const barColor = over ? colors.expense : percent >= 80 ? '#F59E0B' : colors.primary;

          return (
            <View key={b.id} style={styles.budgetItem}>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetName, { color: colors.text }]} numberOfLines={1}>{b.name}</Text>
                <IconButton onPress={() => confirmDelete(b)} size={28}>
                  <Trash2 size={18} color={colors.textSecondary} />
                </IconButton>
              </View>

              {/* 金额与周期行（保持你的原有信息结构） */}
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {formatCurrency(total, (b.currency as any) || (undefined as any))} · {b.startDate} ~ {b.endDate} {!!b.currency ? ` · ${b.currency}` : ''}
              </Text>

              {/* 预算完成度进度条 */}
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    backgroundColor: barColor,
                  }}
                />
              </View>

              {/* 进度说明：已花/总额 + 百分比/超支标识 */}
              <View style={styles.bottomRow}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {formatCurrency(spent, (b.currency as any) || (undefined as any))} / {formatCurrency(total, (b.currency as any) || (undefined as any))}
                </Text>
                {over ? (
                  <Text style={{ color: colors.expense, fontSize: 12, fontWeight: '600' }}>
                    {(t('overspent') as any) || '已超支'}
                  </Text>
                ) : (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {percent}%
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton onPress={() => router.back()} size={36}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{t('budget') || '预算设置'}</Text>
        <View style={{ width: 36 }} />
      </View>
      {/* DEBUG 面板：确认是否渲染到这个文件、以及数据量 */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
          DEBUG · budgets: {budgets.length} · transactions: {transactions.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16, paddingTop: 8 }}>
        {/* 添加预算计划入口：放在进度列表上方 */}
        <Card padding={12}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
              {t('addBudgetPlan') || '添加预算计划'}
            </Text>
            <Pressable
              onPress={() => {
                // TODO: 在此接入你的新增预算流程或路由，如 router.push('/settings/add-budget')
                Alert.alert(t('todo') || '敬请期待', (t('addBudgetTodo') as any) || '请接入新增预算页面或流程');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
            >
              <Plus size={16} color={colors.text} />
              <Text style={{ color: colors.text, marginLeft: 6, fontSize: 12, fontWeight: '600' }}>
                {t('add') || '添加'}
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* 读取诊断：显示预算数量，便于确认是否读到数据 */}
        {!loading && (
          <Card padding={12}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {(t('loadedBudgetsCount') as any) || '读取到的预算数量'}：{budgets.length}
            </Text>
          </Card>
        )}

        {loading ? (
          <Card padding={16}>
            <Text style={{ color: colors.textSecondary }}>{t('loading') || '加载中...'}</Text>
          </Card>
        ) : budgets.length === 0 ? (
          <Card padding={16}>
            <Text style={{ color: colors.textSecondary }}>{t('noBudgets') || '暂无预算'}</Text>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            <Section title={(t('ongoing') as any) || '进行中'} data={groups.ongoing} />
            <Section title={(t('upcoming') as any) || '将开始'} data={groups.upcoming} />
            <Section title={(t('ended') as any) || '已结束'} data={groups.ended} />
          </View>
        )}
        <View style={{ height: 12 }} />
        <Card padding={12}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {(t('budgetReadonlyHint') as any) || '预算一旦设定不可更改，只能删除并重新创建。'}
          </Text>
        </Card>
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetItem: {
    marginBottom: 14,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  budgetName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  bottomRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});