import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

type Language = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Tabs
    home: 'Home',
    transactions: 'Transactions',
    stats: 'Statistics',
    settings: 'Settings',
    
    // Home screen
    balance: 'Balance',
    totalIncome: 'Total Income',
    totalExpense: 'Total Expense',
    thisMonth: 'This Month',
    recentTransactions: 'Recent Transactions',
    noTransactions: 'No transactions yet',
    addFirst: 'Add your first transaction!',
    
    // Add transaction
    addTransaction: 'Add Transaction',
    income: 'Income',
    expense: 'Expense',
    amount: 'Amount',
    category: 'Category',
    description: 'Description',
    date: 'Date',
    save: 'Save',
    cancel: 'Cancel',
    
    // Categories
    food: 'Food',
    transport: 'Transport',
    shopping: 'Shopping',
    entertainment: 'Entertainment',
    health: 'Health',
    education: 'Education',
    salary: 'Salary',
    freelance: 'Freelance',
    investment: 'Investment',
    other: 'Other',
    
    // Settings
    language: 'Language',
    english: 'English',
    chinese: '中文',
    
    // Common
    today: 'Today',
    yesterday: 'Yesterday',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    editTransaction: 'Edit Transaction',
    update: 'Update',
    deleteConfirm: 'Are you sure you want to delete this transaction?',
    operationLogs: 'Operation Logs',
    pieChart: 'Category Distribution',
    noData: 'No data available',
    
    // Theme
    theme: 'Theme',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    systemTheme: 'Follow System',
    
    // Currency
    currency: 'Currency',
    
    // App Info
    appName: 'Finance Assistant',
    appVersion: 'v1.0.0',
    appDescription: 'Simple and easy-to-use personal finance tool',
  },
  zh: {
    // Tabs
    home: '首页',
    transactions: '交易记录',
    stats: '统计',
    settings: '设置',
    
    // Home screen
    balance: '余额',
    totalIncome: '总收入',
    totalExpense: '总支出',
    thisMonth: '本月',
    recentTransactions: '最近交易',
    noTransactions: '暂无交易记录',
    addFirst: '添加您的第一笔交易！',
    
    // Add transaction
    addTransaction: '添加交易',
    income: '收入',
    expense: '支出',
    amount: '金额',
    category: '分类',
    description: '描述',
    date: '日期',
    save: '保存',
    cancel: '取消',
    
    // Categories
    food: '餐饮',
    transport: '交通',
    shopping: '购物',
    entertainment: '娱乐',
    health: '医疗',
    education: '教育',
    salary: '工资',
    freelance: '自由职业',
    investment: '投资',
    other: '其他',
    
    // Settings
    language: '语言',
    english: 'English',
    chinese: '中文',
    
    // Common
    today: '今天',
    yesterday: '昨天',
    edit: '编辑',
    delete: '删除',
    confirm: '确认',
    editTransaction: '编辑交易',
    update: '更新',
    deleteConfirm: '确定要删除这笔交易吗？',
    operationLogs: '操作记录',
    pieChart: '分类占比',
    noData: '暂无数据',
    
    // Theme
    theme: '主题',
    lightTheme: '浅色',
    darkTheme: '深色',
    systemTheme: '跟随系统',
    
    // Currency
    currency: '货币',
    
    // App Info
    appName: '记账助手',
    appVersion: 'v1.0.0',
    appDescription: '简单易用的个人财务管理工具',
  },
  es: {
    // Tabs
    home: 'Inicio',
    transactions: 'Transacciones',
    stats: 'Estadísticas',
    settings: 'Configuración',
    
    // Home screen
    balance: 'Balance',
    totalIncome: 'Ingresos Totales',
    totalExpense: 'Gastos Totales',
    thisMonth: 'Este Mes',
    recentTransactions: 'Transacciones Recientes',
    noTransactions: 'No hay transacciones aún',
    addFirst: '¡Añade tu primera transacción!',
    
    // Add transaction
    addTransaction: 'Añadir Transacción',
    income: 'Ingreso',
    expense: 'Gasto',
    amount: 'Cantidad',
    category: 'Categoría',
    description: 'Descripción',
    date: 'Fecha',
    save: 'Guardar',
    cancel: 'Cancelar',
    
    // Categories
    food: 'Comida',
    transport: 'Transporte',
    shopping: 'Compras',
    entertainment: 'Entretenimiento',
    health: 'Salud',
    education: 'Educación',
    salary: 'Salario',
    freelance: 'Freelance',
    investment: 'Inversión',
    other: 'Otro',
    
    // Settings
    language: 'Idioma',
    english: 'English',
    chinese: '中文',
    
    // Common
    today: 'Hoy',
    yesterday: 'Ayer',
    edit: 'Editar',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    editTransaction: 'Editar Transacción',
    update: 'Actualizar',
    deleteConfirm: '¿Estás seguro de que quieres eliminar esta transacción?',
    operationLogs: 'Registros de Operación',
    pieChart: 'Distribución por Categoría',
    noData: 'No hay datos disponibles',
    
    // Theme
    theme: 'Tema',
    lightTheme: 'Claro',
    darkTheme: 'Oscuro',
    systemTheme: 'Seguir Sistema',
    
    // Currency
    currency: 'Moneda',
    
    // App Info
    appName: 'Asistente Financiero',
    appVersion: 'v1.0.0',
    appDescription: 'Herramienta de finanzas personales simple y fácil de usar',
  },
  fr: {
    // Tabs
    home: 'Accueil',
    transactions: 'Transactions',
    stats: 'Statistiques',
    settings: 'Paramètres',
    
    // Home screen
    balance: 'Solde',
    totalIncome: 'Revenus Totaux',
    totalExpense: 'Dépenses Totales',
    thisMonth: 'Ce Mois',
    recentTransactions: 'Transactions Récentes',
    noTransactions: 'Aucune transaction pour le moment',
    addFirst: 'Ajoutez votre première transaction !',
    
    // Add transaction
    addTransaction: 'Ajouter Transaction',
    income: 'Revenu',
    expense: 'Dépense',
    amount: 'Montant',
    category: 'Catégorie',
    description: 'Description',
    date: 'Date',
    save: 'Enregistrer',
    cancel: 'Annuler',
    
    // Categories
    food: 'Nourriture',
    transport: 'Transport',
    shopping: 'Achats',
    entertainment: 'Divertissement',
    health: 'Santé',
    education: 'Éducation',
    salary: 'Salaire',
    freelance: 'Freelance',
    investment: 'Investissement',
    other: 'Autre',
    
    // Settings
    language: 'Langue',
    english: 'English',
    chinese: '中文',
    
    // Common
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    edit: 'Modifier',
    delete: 'Supprimer',
    confirm: 'Confirmer',
    editTransaction: 'Modifier Transaction',
    update: 'Mettre à jour',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cette transaction ?',
    operationLogs: 'Journaux d\'Opération',
    pieChart: 'Répartition par Catégorie',
    noData: 'Aucune donnée disponible',
    
    // Theme
    theme: 'Thème',
    lightTheme: 'Clair',
    darkTheme: 'Sombre',
    systemTheme: 'Suivre Système',
    
    // Currency
    currency: 'Devise',
    
    // App Info
    appName: 'Assistant Financier',
    appVersion: 'v1.0.0',
    appDescription: 'Outil de finances personnelles simple et facile à utiliser',
  },
  de: {
    // Tabs
    home: 'Startseite',
    transactions: 'Transaktionen',
    stats: 'Statistiken',
    settings: 'Einstellungen',
    
    // Home screen
    balance: 'Saldo',
    totalIncome: 'Gesamteinkommen',
    totalExpense: 'Gesamtausgaben',
    thisMonth: 'Diesen Monat',
    recentTransactions: 'Letzte Transaktionen',
    noTransactions: 'Noch keine Transaktionen',
    addFirst: 'Fügen Sie Ihre erste Transaktion hinzu!',
    
    // Add transaction
    addTransaction: 'Transaktion hinzufügen',
    income: 'Einkommen',
    expense: 'Ausgabe',
    amount: 'Betrag',
    category: 'Kategorie',
    description: 'Beschreibung',
    date: 'Datum',
    save: 'Speichern',
    cancel: 'Abbrechen',
    
    // Categories
    food: 'Essen',
    transport: 'Transport',
    shopping: 'Einkaufen',
    entertainment: 'Unterhaltung',
    health: 'Gesundheit',
    education: 'Bildung',
    salary: 'Gehalt',
    freelance: 'Freelance',
    investment: 'Investition',
    other: 'Andere',
    
    // Settings
    language: 'Sprache',
    english: 'English',
    chinese: '中文',
    
    // Common
    today: 'Heute',
    yesterday: 'Gestern',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    confirm: 'Bestätigen',
    editTransaction: 'Transaktion bearbeiten',
    update: 'Aktualisieren',
    deleteConfirm: 'Sind Sie sicher, dass Sie diese Transaktion löschen möchten?',
    operationLogs: 'Betriebsprotokolle',
    pieChart: 'Kategorieverteilung',
    noData: 'Keine Daten verfügbar',
    
    // Theme
    theme: 'Design',
    lightTheme: 'Hell',
    darkTheme: 'Dunkel',
    systemTheme: 'System folgen',
    
    // Currency
    currency: 'Währung',
    
    // App Info
    appName: 'Finanzassistent',
    appVersion: 'v1.0.0',
    appDescription: 'Einfaches und benutzerfreundliches Tool für persönliche Finanzen',
  },
  ja: {
    // Tabs
    home: 'ホーム',
    transactions: '取引',
    stats: '統計',
    settings: '設定',
    
    // Home screen
    balance: '残高',
    totalIncome: '総収入',
    totalExpense: '総支出',
    thisMonth: '今月',
    recentTransactions: '最近の取引',
    noTransactions: 'まだ取引がありません',
    addFirst: '最初の取引を追加してください！',
    
    // Add transaction
    addTransaction: '取引を追加',
    income: '収入',
    expense: '支出',
    amount: '金額',
    category: 'カテゴリ',
    description: '説明',
    date: '日付',
    save: '保存',
    cancel: 'キャンセル',
    
    // Categories
    food: '食事',
    transport: '交通',
    shopping: '買い物',
    entertainment: '娯楽',
    health: '健康',
    education: '教育',
    salary: '給与',
    freelance: 'フリーランス',
    investment: '投資',
    other: 'その他',
    
    // Settings
    language: '言語',
    english: 'English',
    chinese: '中文',
    
    // Common
    today: '今日',
    yesterday: '昨日',
    edit: '編集',
    delete: '削除',
    confirm: '確認',
    editTransaction: '取引を編集',
    update: '更新',
    deleteConfirm: 'この取引を削除してもよろしいですか？',
    operationLogs: '操作ログ',
    pieChart: 'カテゴリ分布',
    noData: 'データがありません',
    
    // Theme
    theme: 'テーマ',
    lightTheme: 'ライト',
    darkTheme: 'ダーク',
    systemTheme: 'システムに従う',
    
    // Currency
    currency: '通貨',
    
    // App Info
    appName: '家計簿アシスタント',
    appVersion: 'v1.0.0',
    appDescription: 'シンプルで使いやすい個人財務管理ツール',
  },
  ko: {
    // Tabs
    home: '홈',
    transactions: '거래',
    stats: '통계',
    settings: '설정',
    
    // Home screen
    balance: '잔액',
    totalIncome: '총 수입',
    totalExpense: '총 지출',
    thisMonth: '이번 달',
    recentTransactions: '최근 거래',
    noTransactions: '아직 거래가 없습니다',
    addFirst: '첫 번째 거래를 추가하세요!',
    
    // Add transaction
    addTransaction: '거래 추가',
    income: '수입',
    expense: '지출',
    amount: '금액',
    category: '카테고리',
    description: '설명',
    date: '날짜',
    save: '저장',
    cancel: '취소',
    
    // Categories
    food: '음식',
    transport: '교통',
    shopping: '쇼핑',
    entertainment: '오락',
    health: '건강',
    education: '교육',
    salary: '급여',
    freelance: '프리랜스',
    investment: '투자',
    other: '기타',
    
    // Settings
    language: '언어',
    english: 'English',
    chinese: '中文',
    
    // Common
    today: '오늘',
    yesterday: '어제',
    edit: '편집',
    delete: '삭제',
    confirm: '확인',
    editTransaction: '거래 편집',
    update: '업데이트',
    deleteConfirm: '이 거래를 삭제하시겠습니까?',
    operationLogs: '작업 로그',
    pieChart: '카테고리 분포',
    noData: '데이터가 없습니다',
    
    // Theme
    theme: '테마',
    lightTheme: '라이트',
    darkTheme: '다크',
    systemTheme: '시스템 따라가기',
    
    // Currency
    currency: '통화',
    
    // App Info
    appName: '가계부 도우미',
    appVersion: 'v1.0.0',
    appDescription: '간단하고 사용하기 쉬운 개인 재무 관리 도구',
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const detectDeviceLang = (): Language => {
    try {
      const locales = (Localization as any)?.getLocales?.() ?? [];
      const tag = locales[0]?.languageCode ?? locales[0]?.languageTag ?? '';
      const lc = String(tag || '').toLowerCase();
      if (lc.startsWith('zh')) return 'zh';
      if (lc.startsWith('en')) return 'en';
      if (lc.startsWith('es')) return 'es';
      if (lc.startsWith('fr')) return 'fr';
      if (lc.startsWith('de')) return 'de';
      if (lc.startsWith('ja')) return 'ja';
      if (lc.startsWith('ko')) return 'ko';
    } catch {}
    return 'en';
  };
  const [language, setLanguage] = useState<Language>(detectDeviceLang());

  // 从 AsyncStorage 加载语言设置
  useEffect(() => {
    loadLanguage();
  }, []);

  // 保存语言设置到 AsyncStorage
  useEffect(() => {
    saveLanguage();
  }, [language]);

  const loadLanguage = async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem('@expense_tracker_language');
      if (storedLanguage && ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'].includes(storedLanguage)) {
        setLanguage(storedLanguage as Language);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  };

  const saveLanguage = async () => {
    try {
      await AsyncStorage.setItem('@expense_tracker_language', language);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const t = (key: string): string => {
    const dict = (translations as Record<Language, Record<string, string>>)[language];
    const fallback = (translations as Record<Language, Record<string, string>>)['en'];
    return dict[key] ?? fallback[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}