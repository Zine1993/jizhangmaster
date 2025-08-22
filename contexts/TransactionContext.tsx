import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'HKD' | 'TWD' | 'SGD' | 'AUD' | 'CAD' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'RUB' | 'INR' | 'BRL' | 'MXN' | 'ZAR' | 'THB' | 'VND' | 'IDR' | 'MYR' | 'PHP';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
}

interface TransactionContextType {
  transactions: Transaction[];
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  getMonthlyStats: () => { income: number; expense: number; balance: number };
  getCurrencySymbol: () => string;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

const STORAGE_KEY = '@expense_tracker_transactions';
const CURRENCY_STORAGE_KEY = '@expense_tracker_currency';

interface TransactionProviderProps {
  children: ReactNode;
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrencyState] = useState<Currency>('CNY');

  // Load transactions from storage
  useEffect(() => {
    loadTransactions();
    loadCurrency();
  }, []);

  // Save transactions to storage whenever they change
  useEffect(() => {
    saveTransactions();
  }, [transactions]);

  // Save currency to storage whenever it changes
  useEffect(() => {
    saveCurrency();
  }, [currency]);

  const loadTransactions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const transactionsWithDates = parsed.map((t: any) => ({
          ...t,
          date: new Date(t.date),
        }));
        setTransactions(transactionsWithDates);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const loadCurrency = async () => {
    try {
      const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored && isValidCurrency(stored)) {
        setCurrencyState(stored as Currency);
      }
    } catch (error) {
      console.error('Failed to load currency:', error);
    }
  };

  const saveTransactions = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  };

  const saveCurrency = async () => {
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch (error) {
      console.error('Failed to save currency:', error);
    }
  };

  const isValidCurrency = (value: string): boolean => {
    const validCurrencies: Currency[] = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'HKD', 'TWD', 'SGD', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK', 'RUB', 'INR', 'BRL', 'MXN', 'ZAR', 'THB', 'VND', 'IDR', 'MYR', 'PHP'];
    return validCurrencies.includes(value as Currency);
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const updateTransaction = (id: string, updatedTransaction: Omit<Transaction, 'id'>) => {
    const existingTransaction = transactions.find(t => t.id === id);
    if (!existingTransaction) return;

    const updated: Transaction = {
      ...updatedTransaction,
      id,
    };
    
    setTransactions(prev => prev.map(t => t.id === id ? updated : t));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const getCurrencySymbol = () => {
    const currencySymbols: Record<Currency, string> = {
      CNY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      KRW: '₩',
      HKD: 'HK$',
      TWD: 'NT$',
      SGD: 'S$',
      AUD: 'A$',
      CAD: 'C$',
      CHF: 'CHF',
      SEK: 'kr',
      NOK: 'kr',
      DKK: 'kr',
      RUB: '₽',
      INR: '₹',
      BRL: 'R$',
      MXN: '$',
      ZAR: 'R',
      THB: '฿',
      VND: '₫',
      IDR: 'Rp',
      MYR: 'RM',
      PHP: '₱',
    };

    return currencySymbols[currency];
  };

  const getMonthlyStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    return { income, expense, balance };
  };

  return (
    <TransactionContext.Provider 
      value={{ 
        transactions, 
        currency,
        setCurrency,
        addTransaction, 
        updateTransaction,
        deleteTransaction, 
        getMonthlyStats,
        getCurrencySymbol
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}