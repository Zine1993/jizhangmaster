import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Languages, Sun, Moon, Smartphone, DollarSign, ChevronDown, Check, X, LogIn, LogOut, Upload, Download } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactions, Currency } from '@/contexts/TransactionContext';
import { useAuth } from '@/contexts/AuthContext';

type Language = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';

interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
}

interface ThemeInfo {
  mode: 'light' | 'dark' | 'system';
  name: string;
  icon: React.ReactNode;
}

interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
}

const languages: LanguageInfo[] = [
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

const currencies: CurrencyInfo[] = [
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KRW', name: 'Korean Won', symbol: '₩' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
];

export default function SettingsScreen() {
  const { t, language, setLanguage } = useLanguage();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { currency, setCurrency, exportData, importData } = useTransactions();
  const { user, signOut, requireLogin } = useAuth();
  
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const themes: ThemeInfo[] = [
    { mode: 'light', name: t('lightTheme'), icon: <Sun size={20} color={colors.primary} /> },
    { mode: 'dark', name: t('darkTheme'), icon: <Moon size={20} color={colors.primary} /> },
    { mode: 'system', name: t('systemTheme'), icon: <Smartphone size={20} color={colors.primary} /> },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);
  const currentTheme = themes.find(theme => theme.mode === themeMode);
  const currentCurrency = currencies.find(curr => curr.code === currency);

  const SettingItem = ({ 
    icon, 
    title, 
    value, 
    onPress 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value: string; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
          {icon}
        </View>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
        <ChevronDown size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const ActionItem = ({
    icon,
    title,
    danger,
    onPress,
  }: {
    icon: React.ReactNode;
    title: string;
    danger?: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.actionItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: (danger ? '#ff3b3015' : colors.primary + '15') }]}>
          {icon}
        </View>
        <Text style={[styles.settingTitle, { color: danger ? '#ff3b30' : colors.text }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings')}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 账户（移动到最上方） */}
        <View style={styles.section}>
          {user ? (
            <>
              <View style={[styles.accountRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.accountText, { color: colors.textSecondary }]}>已登录账号</Text>
                <Text style={[styles.accountEmail, { color: colors.text }]} numberOfLines={1}>{user.email}</Text>
              </View>
              <ActionItem
                icon={<LogOut size={20} color={'#ff3b30'} />}
                title={'退出登录'}
                danger
                onPress={async () => {
                  const res = await signOut();
                  if (!res?.ok) {
                    Alert.alert('退出失败', res?.error || '请重试');
                  }
                }}
              />
            </>
          ) : (
            <ActionItem
              icon={<LogIn size={20} color={colors.primary} />}
              title={'登录 / 注册'}
              onPress={() => {
                // 触发登录页（AuthGate 会在根布局拦截）
                requireLogin().catch(() => {});
              }}
            />
          )}
        </View>

        {/* 外观与偏好 */}
        <View style={styles.section}>
          <SettingItem
            icon={<Sun size={20} color={colors.primary} />}
            title={t('theme')}
            value={currentTheme?.name || ''}
            onPress={() => setShowThemeModal(true)}
          />
          <SettingItem
            icon={<Languages size={20} color={colors.primary} />}
            title={t('language')}
            value={currentLanguage?.nativeName || ''}
            onPress={() => setShowLanguageModal(true)}
          />
          <SettingItem
            icon={<DollarSign size={20} color={colors.primary} />}
            title={t('currency')}
            value={`${currentCurrency?.symbol} ${currentCurrency?.name}`}
            onPress={() => setShowCurrencyModal(true)}
          />
        </View>

        {/* 数据 */}
        <View style={styles.section}>
          <ActionItem
            icon={<Upload size={20} color={colors.primary} />}
            title={'导出数据（JSON）'}
            onPress={async () => {
              try {
                const payload = exportData();
                await Share.share({ message: payload });
              } catch (e) {
                Alert.alert('导出失败', '请重试');
              }
            }}
          />
          <ActionItem
            icon={<Download size={20} color={colors.primary} />}
            title={'导入数据（粘贴 JSON）'}
            onPress={() => setShowImportModal(true)}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('appName')} {t('appVersion')}</Text>
          <Text style={[styles.footerSubText, { color: colors.textTertiary }]}>{t('appDescription')}</Text>
        </View>
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('theme')}</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {themes.map((theme) => (
                <TouchableOpacity
                  key={theme.mode}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    (themeMode === theme.mode) && { backgroundColor: colors.primary + '15' }
                  ]}
                  onPress={() => {
                    setThemeMode(theme.mode);
                    setShowThemeModal(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={styles.themeOption}>
                      {theme.icon}
                      <Text style={[styles.modalOptionText, { color: colors.text }]}>{theme.name}</Text>
                    </View>
                  </View>
                  {(themeMode === theme.mode) && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('language')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    (language === lang.code) && { backgroundColor: colors.primary + '15' }
                  ]}
                  onPress={() => {
                    setLanguage(lang.code);
                    setShowLanguageModal(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={styles.languageOption}>
                      <Text style={[styles.modalOptionText, { color: colors.text }]}>{lang.nativeName}</Text>
                      <Text style={[styles.modalOptionSubText, { color: colors.textSecondary }]}>{lang.name}</Text>
                    </View>
                  </View>
                  {(language === lang.code) && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('currency')}</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {currencies.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    (currency === curr.code) && { backgroundColor: colors.primary + '15' }
                  ]}
                  onPress={() => {
                    setCurrency(curr.code);
                    // 明确一对一联动语言（避免误覆盖）
                    if (curr.code === 'CNY' || curr.code === 'HKD' || curr.code === 'TWD') {
                      setLanguage('zh');
                    } else if (curr.code === 'JPY') {
                      setLanguage('ja');
                    } else if (curr.code === 'KRW') {
                      setLanguage('ko');
                    }
                    setShowCurrencyModal(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={styles.currencyOption}>
                      <Text style={[styles.currencySymbol, { color: colors.primary }]}>{curr.symbol}</Text>
                      <View>
                        <Text style={[styles.modalOptionText, { color: colors.text }]}>{curr.name}</Text>
                        <Text style={[styles.modalOptionSubText, { color: colors.textSecondary }]}>{curr.code}</Text>
                      </View>
                    </View>
                  </View>
                  {(currency === curr.code) && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>导入数据</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text style={[{ marginBottom: 8, color: colors.textSecondary }]}>将导出的 JSON 内容粘贴到下方：</Text>
              <TextInput
                style={[styles.importInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="粘贴 JSON"
                placeholderTextColor={colors.textTertiary}
                value={importText}
                onChangeText={setImportText}
                multiline
              />
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={() => {
                  const res = importData(importText);
                  if (res.ok) {
                    Alert.alert('导入成功', `共导入 ${res.imported} 条记录`);
                    setShowImportModal(false);
                    setImportText('');
                  } else {
                    Alert.alert('导入失败', res.error || '请检查 JSON 内容');
                  }
                }}
              >
                <Text style={styles.primaryText}>开始导入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  accountRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  accountText: {
    fontSize: 12,
    marginBottom: 6,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionSubText: {
    fontSize: 14,
    marginTop: 2,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageOption: {
    flex: 1,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    minWidth: 32,
    textAlign: 'center',
  },
  importInput: {
    borderWidth: 1,
    minHeight: 160,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
  },
  primaryBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});