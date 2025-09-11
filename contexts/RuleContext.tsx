import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RuleAction = 'confirm' | 'delay' | 'notify' | 'gotoBudget';

export type EmotionRule = {
  id: string;
  createdAt: number;
  enabled: boolean;
  // 条件
  emotion?: string;          // 情绪名
  category?: string;         // 分类
  timeRange?: { start: number; end: number }; // 小时范围 0..24
  amountMin?: number;        // 金额阈值（>=）
  type?: 'income' | 'expense';
  currency?: string;
  // 动作
  action: RuleAction;
  // 备注
  note?: string;
};

type HookResult = {
  shouldBlock: boolean;
  suggestions: { action: RuleAction; ruleId: string; message?: string }[];
  delayMs?: number;
};

type RuleContextValue = {
  rules: EmotionRule[];
  createRule: (rule: Omit<EmotionRule, 'id' | 'createdAt' | 'enabled'>) => Promise<string>;
  updateRule: (id: string, patch: Partial<EmotionRule>) => Promise<void>;
  listRules: () => EmotionRule[];
  onTransactionHook: (tx: { type: 'income' | 'expense'; amount: number; category?: string; emotion?: { name: string }; currency?: string; date?: string | number | Date }) => HookResult;
};

const RuleContext = createContext<RuleContextValue | undefined>(undefined);

const STORAGE_KEY = '@emotion_rules_v1';

export function RuleProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = useState<EmotionRule[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr = raw ? (JSON.parse(raw) as EmotionRule[]) : [];
        setRules(Array.isArray(arr) ? arr : []);
      } catch {
        setRules([]);
      }
    })();
  }, []);

  const persist = useCallback(async (next: EmotionRule[]) => {
    setRules(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const createRule = useCallback<RuleContextValue['createRule']>(async (ruleInput) => {
    const id = Math.random().toString(36).slice(2);
    const r: EmotionRule = { id, createdAt: Date.now(), enabled: true, ...ruleInput };
    const next = [r, ...rules];
    await persist(next);
    return id;
  }, [rules, persist]);

  const updateRule = useCallback<RuleContextValue['updateRule']>(async (id, patch) => {
    const next = rules.map(r => r.id === id ? { ...r, ...patch } : r);
    await persist(next);
  }, [rules, persist]);

  const listRules = useCallback(() => rules, [rules]);

  const onTransactionHook = useCallback<RuleContextValue['onTransactionHook']>((tx) => {
    const d = tx.date ? new Date(tx.date) : new Date();
    const hour = d.getHours();
    const matched = rules.filter(r => {
      if (!r.enabled) return false;
      if (r.type && r.type !== tx.type) return false;
      if (r.currency && r.currency !== (tx.currency || '')) return false;
      if (r.emotion && r.emotion !== (tx.emotion?.name || '')) return false;
      if (r.category && r.category !== (tx.category || '')) return false;
      if (typeof r.amountMin === 'number' && !(tx.amount >= r.amountMin)) return false;
      if (r.timeRange) {
        const { start, end } = r.timeRange;
        const inRange = start <= end ? (hour >= start && hour < end) : (hour >= start || hour < end);
        if (!inRange) return false;
      }
      return true;
    });

    if (matched.length === 0) return { shouldBlock: false, suggestions: [] };

    const suggestions = matched.map(m => ({ action: m.action, ruleId: m.id })) as HookResult['suggestions'];
    const shouldBlock = matched.some(m => m.action === 'confirm' || m.action === 'delay');
    const delayMs = matched.some(m => m.action === 'delay') ? 5 * 60 * 1000 : undefined;
    return { shouldBlock, suggestions, delayMs };
  }, [rules]);

  const value = useMemo<RuleContextValue>(() => ({
    rules, createRule, updateRule, listRules, onTransactionHook
  }), [rules, createRule, updateRule, listRules, onTransactionHook]);

  return <RuleContext.Provider value={value}>{children}</RuleContext.Provider>;
}

export function useRules() {
  const ctx = useContext(RuleContext);
  if (!ctx) throw new Error('useRules must be used within RuleProvider');
  return ctx;
}