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
    homeSubtitle: 'Data overview',
    statsSubtitle: 'Global data analysis',
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
    transactionType: 'Transaction Type',
    currentEmotion: 'Current Emotion',
    notePlaceholder: 'Notes (optional)',
    
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
    // Header
    greetTitle: 'Enjoy every day',
    guestSubtitle: 'Sign in to keep your data safe',
    logout: 'Sign out',
    insights: 'Insights',
    recordsSubtitle: 'Your income and expense records',
    mainEmotion: 'Top spending emotion',
    spendTimes: 'times',
    topCategories: 'Top Categories',
    insightsSubtitle: 'AI analyzes your spending emotion patterns',
    emotionRanking: 'Emotion ranking',
    patternAnalysis: 'Spending pattern analysis',
    smartAdvice: 'Smart suggestions',
    recordMoreToSee: 'Record a few entries to see insights',
    usedDaysPrefix: 'Used days:',
    daysUnit: 'days',
    keepRecordingTip: 'Keep recording to better understand your emotions and spending.',
    
    // Theme
    theme: 'Theme',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    systemTheme: 'Follow System',
    
    // Currency
    currency: 'Currency',
    
    // App Info
    appName: 'MoodLedger',
    authTitle: 'MoodLedger',
    authSubtitle: 'Track spending, understand emotions, improve life',
    appVersion: 'v1.0.0',
    appDescription: 'Simple and easy-to-use personal finance tool',
    // Settings extensions
    loggedInAccount: 'Logged-in account',
    logoutFailed: 'Sign out failed',
    pleaseRetry: 'Please try again',
    loginOrRegister: 'Log in / Register',
    exportDataJSON: 'Export data (JSON)',
    exportFailed: 'Export failed',
    importDataPasteJSON: 'Import data (paste JSON)',
    importData: 'Import data',
    pasteJsonBelow: 'Paste the exported JSON content below:',
    pasteJsonPlaceholder: 'Paste JSON',
    startImport: 'Start import',
    importSuccess: 'Import succeeded',
    importedPrefix: 'Imported ',
    importedSuffix: ' records',
    importFailed: 'Import failed',
    checkJson: 'Please check the JSON content',
    emotionTagManagement: 'Emotion tag management',
    add: 'Add',
    addEmotionTag: 'Add emotion tag',
    emoji: 'Emoji',
    egEmoji: 'e.g. 😊',
    name: 'Name',
    egHappy: 'e.g. Happy',
    pleaseEnterName: 'Please enter a name',
    emotionTags: 'Emotion tags',
    usageDays: 'Usage days',
    // Emotions (default tags)
    '开心': 'Happy',
    '焦虑': 'Anxious',
    '孤独': 'Lonely',
    '无聊': 'Bored',
    '奖励自己': 'Treat myself',
    '压力大': 'Stressed',
    '兴奋': 'Excited',
    '难过': 'Sad',
    // Insights tip
    analysisTip: 'When you are {emotion}, your average spending is higher. Consider setting a budget reminder to stay rational.',
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
    homeSubtitle: '数据总览',
    statsSubtitle: '全局数据分析',
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
    transactionType: '交易类型',
    currentEmotion: '当前情绪',
    notePlaceholder: '备注信息（可选）',
    
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
    // Header
    greetTitle: '开心生活每一天',
    guestSubtitle: '登录数据不丢失',
    logout: '退出',
    insights: '洞察',
    recordsSubtitle: '你的消费与收入记录',
    mainEmotion: '主要消费情绪',
    spendTimes: '次消费',
    topCategories: '热门分类',
    insightsSubtitle: 'AI分析你的消费情绪模式',
    emotionRanking: '消费情绪排行',
    patternAnalysis: '消费模式分析',
    smartAdvice: '智能建议',
    recordMoreToSee: '记录几笔后即可看到洞察',
    usedDaysPrefix: '已使用天数：',
    daysUnit: '天',
    keepRecordingTip: '坚持记录能更好理解你的情绪与消费关系。',
    
    // Theme
    theme: '主题',
    lightTheme: '浅色',
    darkTheme: '深色',
    systemTheme: '跟随系统',
    
    // Currency
    currency: '货币',
    
    // App Info
    appName: 'MoodLedger',
    authTitle: 'MoodLedger',
    authSubtitle: '记录消费，理解情绪，改善生活',
    appVersion: 'v1.0.0',
    appDescription: '简单易用的个人财务管理工具',
    // Settings 扩展
    loggedInAccount: '已登录账号',
    logoutFailed: '退出失败',
    pleaseRetry: '请重试',
    loginOrRegister: '登录 / 注册',
    exportDataJSON: '导出数据（JSON）',
    exportFailed: '导出失败',
    importDataPasteJSON: '导入数据（粘贴 JSON）',
    importData: '导入数据',
    pasteJsonBelow: '将导出的 JSON 内容粘贴到下方：',
    pasteJsonPlaceholder: '粘贴 JSON',
    startImport: '开始导入',
    importSuccess: '导入成功',
    importedPrefix: '共导入 ',
    importedSuffix: ' 条记录',
    importFailed: '导入失败',
    checkJson: '请检查 JSON 内容',
    emotionTagManagement: '情绪标签管理',
    add: '添加',
    addEmotionTag: '添加情绪标签',
    emoji: '表情符号',
    egEmoji: '例如 😊',
    name: '名称',
    egHappy: '例如 开心',
    pleaseEnterName: '请输入名称',
    emotionTags: '情绪标签',
    usageDays: '使用天数',
    // Emotions (default tags)
    '开心': '开心',
    '焦虑': '焦虑',
    '孤独': '孤独',
    '无聊': '无聊',
    '奖励自己': '奖励自己',
    '压力大': '压力大',
    '兴奋': '兴奋',
    '难过': '难过',
    // Insights tip
    analysisTip: '你在 {emotion} 时，平均消费较高。建议设置预算提醒，保持理性消费。',
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
    // Header
    greetTitle: 'Disfruta cada día',
    guestSubtitle: 'Inicia sesión para no perder tus datos',
    logout: 'Cerrar sesión',
    insights: 'Perspectivas',
    recordsSubtitle: 'Tus registros de ingresos y gastos',
    mainEmotion: 'Emoción principal de gasto',
    spendTimes: 'veces',
    topCategories: 'Categorías destacadas',
    insightsSubtitle: 'La IA analiza tus patrones de emociones de gasto',
    emotionRanking: 'Ranking de emociones',
    patternAnalysis: 'Análisis de patrones de gasto',
    smartAdvice: 'Sugerencias inteligentes',
    recordMoreToSee: 'Registra algunas transacciones para ver perspectivas',
    usedDaysPrefix: 'Días de uso:',
    daysUnit: 'días',
    keepRecordingTip: 'Sigue registrando para entender mejor tus emociones y gastos.',
    
    // Theme
    theme: 'Tema',
    lightTheme: 'Claro',
    darkTheme: 'Oscuro',
    systemTheme: 'Seguir Sistema',
    
    // Currency
    currency: 'Moneda',
    
    // App Info
    appName: 'MoodLedger',
    authSubtitle: 'Registra gastos, comprende las emociones, mejora tu vida',
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
    // Header
    greetTitle: 'Profitez de chaque jour',
    guestSubtitle: 'Connectez-vous pour ne pas perdre vos données',
    logout: 'Se déconnecter',
    insights: 'Aperçus',
    recordsSubtitle: 'Vos enregistrements de revenus et de dépenses',
    mainEmotion: 'Émotion principale de dépense',
    spendTimes: 'fois',
    topCategories: 'Catégories populaires',
    insightsSubtitle: 'L’IA analyse vos schémas d’émotions de dépense',
    emotionRanking: 'Classement des émotions',
    patternAnalysis: 'Analyse des schémas de dépense',
    smartAdvice: 'Conseils intelligents',
    recordMoreToSee: 'Enregistrez quelques opérations pour voir des aperçus',
    usedDaysPrefix: 'Jours d’utilisation :',
    daysUnit: 'jours',
    keepRecordingTip: 'Continuez à enregistrer pour mieux comprendre vos émotions et dépenses.',
    
    // Theme
    theme: 'Thème',
    lightTheme: 'Clair',
    darkTheme: 'Sombre',
    systemTheme: 'Suivre Système',
    
    // Currency
    currency: 'Devise',
    
    // App Info
    appName: 'MoodLedger',
    authSubtitle: 'Suivez vos dépenses, comprenez vos émotions, améliorez votre vie',
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
    // Header
    greetTitle: 'Genieße jeden Tag',
    guestSubtitle: 'Melde dich an, um deine Daten zu behalten',
    logout: 'Abmelden',
    insights: 'Einblicke',
    recordsSubtitle: 'Deine Einnahmen- und Ausgabenaufzeichnungen',
    mainEmotion: 'Hauptausgaben-Emotion',
    spendTimes: 'mal',
    topCategories: 'Beliebte Kategorien',
    insightsSubtitle: 'KI analysiert deine Ausgaben-Emotionsmuster',
    emotionRanking: 'Emotions-Rangliste',
    patternAnalysis: 'Analyse der Ausgabenmuster',
    smartAdvice: 'Intelligente Vorschläge',
    recordMoreToSee: 'Erfasse einige Einträge, um Einblicke zu sehen',
    usedDaysPrefix: 'Nutzungstage:',
    daysUnit: 'Tage',
    keepRecordingTip: 'Weiter protokollieren, um Emotionen und Ausgaben besser zu verstehen.',
    
    // Theme
    theme: 'Design',
    lightTheme: 'Hell',
    darkTheme: 'Dunkel',
    systemTheme: 'System folgen',
    
    // Currency
    currency: 'Währung',
    
    // App Info
    appName: 'MoodLedger',
    authSubtitle: 'Ausgaben erfassen, Emotionen verstehen, Leben verbessern',
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
    // Header
    greetTitle: '毎日を楽しもう',
    guestSubtitle: 'ログインするとデータは失われません',
    logout: 'ログアウト',
    insights: 'インサイト',
    recordsSubtitle: '収入と支出の記録',
    mainEmotion: '主要な支出の感情',
    spendTimes: '回',
    topCategories: '人気カテゴリ',
    insightsSubtitle: 'AI が支出の感情パターンを分析します',
    emotionRanking: '感情ランキング',
    patternAnalysis: '支出パターン分析',
    smartAdvice: 'スマート提案',
    recordMoreToSee: 'いくつか記録するとインサイトが表示されます',
    usedDaysPrefix: '使用日数：',
    daysUnit: '日',
    keepRecordingTip: '記録を続けることで感情と支出をよりよく理解できます。',
    
    // Theme
    theme: 'テーマ',
    lightTheme: 'ライト',
    darkTheme: 'ダーク',
    systemTheme: 'システムに従う',
    
    // Currency
    currency: '通貨',
    
    // App Info
    appName: 'MoodLedger',
    authSubtitle: '支出を記録し、感情を理解して、生活を改善',
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
    // Header
    greetTitle: '매일을 즐기세요',
    guestSubtitle: '로그인하면 데이터가 안전해요',
    logout: '로그아웃',
    insights: '인사이트',
    recordsSubtitle: '수입과 지출 기록',
    mainEmotion: '주요 지출 감정',
    spendTimes: '회',
    topCategories: '인기 카테고리',
    insightsSubtitle: 'AI가 지출 감정 패턴을 분석합니다',
    emotionRanking: '감정 순위',
    patternAnalysis: '지출 패턴 분석',
    smartAdvice: '스마트 제안',
    recordMoreToSee: '몇 개만 기록하면 인사이트를 볼 수 있어요',
    usedDaysPrefix: '사용 일수:',
    daysUnit: '일',
    keepRecordingTip: '기록을 계속하면 감정과 지출을 더 잘 이해할 수 있어요.',
    
    // Theme
    theme: '테마',
    lightTheme: '라이트',
    darkTheme: '다크',
    systemTheme: '시스템 따라가기',
    
    // Currency
    currency: '통화',
    
    // App Info
    appName: 'MoodLedger',
    authSubtitle: '지출을 기록하고 감정을 이해해 더 나은 생활로',
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