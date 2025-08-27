import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Share, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Languages, Sun, Moon, Smartphone, DollarSign, ChevronDown, Check, X, LogIn, LogOut, Upload, Download, Plus, Trash2 } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactions, Currency } from '@/contexts/TransactionContext';
import { useAuth } from '@/contexts/AuthContext';
import GradientHeader from '@/components/ui/GradientHeader';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';

type Language = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';
interface LanguageInfo { code: Language; name: string; nativeName: string }
interface ThemeInfo { mode: 'light' | 'dark' | 'system'; name: string; icon: React.ReactNode }
interface CurrencyInfo { code: Currency; name: string; symbol: string }

const languages: LanguageInfo[] = [
  { code: 'zh', name: 'Chinese', nativeName: '中文' }, { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' }, { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' }, { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

const currencies: CurrencyInfo[] = [
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }, { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' }, { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }, { code: 'KRW', name: 'Korean Won', symbol: '₩' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' }, { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' }, { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' }, { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' }, { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' }, { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' }, { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' }, { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' }, { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' }, { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
];
 
function getCurrencyName(code: Currency, lang: Language): string {
  if (lang === 'zh') {
    const zh: Record<Currency, string> = {
      CNY: '人民币',
      USD: '美元',
      EUR: '欧元',
      GBP: '英镑',
      JPY: '日元',
      KRW: '韩元',
      HKD: '港币',
      TWD: '新台币',
      SGD: '新加坡元',
      AUD: '澳大利亚元',
      CAD: '加拿大元',
      CHF: '瑞士法郎',
      SEK: '瑞典克朗',
      NOK: '挪威克朗',
      DKK: '丹麦克朗',
      RUB: '卢布',
      INR: '卢比',
      BRL: '巴西雷亚尔',
      MXN: '墨西哥比索',
      ZAR: '南非兰特',
      THB: '泰铢',
      VND: '越南盾',
      IDR: '印尼盾',
      MYR: '马来西亚林吉特',
      PHP: '菲律宾比索',
    };
    return zh[code] || code;
  }
  return currencies.find(c => c.code === code)?.name || code;
}

export default function SettingsScreen() {
  const { t, language, setLanguage } = useLanguage();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { currency, setCurrency, exportData, importData, emotions, addEmotionTag, removeEmotionTag, getUsageDaysCount } = useTransactions();
  const { user, signOut, requireLogin } = useAuth();

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showAddEmotionModal, setShowAddEmotionModal] = useState(false);
  const [emotionName, setEmotionName] = useState('');
  const [emotionEmoji, setEmotionEmoji] = useState('🙂');

  const themes: ThemeInfo[] = [
    { mode: 'light', name: t('lightTheme'), icon: <Sun size={20} color={'#fff'} /> },
    { mode: 'dark', name: t('darkTheme'), icon: <Moon size={20} color={'#fff'} /> },
    { mode: 'system', name: t('systemTheme'), icon: <Smartphone size={20} color={'#fff'} /> },
  ];

  const currentLanguage = languages.find((lang) => lang.code === language);
  const currentTheme = themes.find((theme) => theme.mode === themeMode);
  const currentCurrency = currencies.find((curr) => curr.code === currency);

  const SettingItem = ({ icon, title, value, onPress }: { icon: React.ReactNode; title: string; value?: string; onPress?: () => void }) => (
    <TouchableOpacity style={[styles.settingItem, { borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: colors.primary + '1A' }]}>{icon}</View>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        {!!value && <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>}
        <ChevronDown size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const ActionItem = ({ icon, title, danger, onPress }: { icon: React.ReactNode; title: string; danger?: boolean; onPress?: () => void }) => (
    <TouchableOpacity style={[styles.actionItem, { borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: danger ? '#ff3b3015' : colors.primary + '1A' }]}>{icon}</View>
        <Text style={[styles.settingTitle, { color: danger ? '#ff3b30' : colors.text }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GradientHeader variant="userInfo" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 账户 */}
        <Card padding={0}>
          {user ? (
            <View style={[styles.accountRow, { borderColor: colors.border }]}>
              <Text style={[styles.accountText, { color: colors.textSecondary }]}>{t('loggedInAccount')}</Text>
              <Text style={[styles.accountEmail, { color: colors.text }]} numberOfLines={1}>{user.email}</Text>
            </View>
          ) : null}
          {user ? (
            <ActionItem
              icon={<LogOut size={20} color={'#ff3b30'} />}
              title={t('logout')}
              danger
              onPress={async () => {
                const res = await signOut();
                if (!res?.ok) Alert.alert(t('logoutFailed'), res?.error || t('pleaseRetry'));
              }}
            />
          ) : (
            <ActionItem icon={<LogIn size={20} color={colors.primary} />} title={t('loginOrRegister')} onPress={() => { requireLogin().catch(() => {}); }} />
          )}
        </Card>

        {/* 外观与偏好 */}
        <Card padding={0}>
          <SettingItem icon={<Sun size={20} color={colors.primary} />} title={t('theme')} value={currentTheme?.name || ''} onPress={() => setShowThemeModal(true)} />
          <SettingItem icon={<Languages size={20} color={colors.primary} />} title={t('language')} value={currentLanguage?.nativeName || ''} onPress={() => setShowLanguageModal(true)} />
          <SettingItem icon={<DollarSign size={20} color={colors.primary} />} title={t('currency')} value={`${currentCurrency?.symbol} ${getCurrencyName(currency, language)}`} onPress={() => setShowCurrencyModal(true)} />
        </Card>

        {/* 数据 */}
        <Card padding={0}>
          <ActionItem
            icon={<Upload size={20} color={colors.primary} />}
            title={t('exportDataJSON')}
            onPress={async () => {
              try { const payload = exportData(); await Share.share({ message: payload }); }
              catch { Alert.alert(t('exportFailed'), t('pleaseRetry')); }
            }}
          />
          <ActionItem icon={<Download size={20} color={colors.primary} />} title={t('importDataPasteJSON')} onPress={() => setShowImportModal(true)} />
        </Card>

        {/* 情绪标签管理 */}
        <Card padding={0}>
          <View style={styles.emotionHeader}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>{t('emotionTagManagement')}</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => { setEmotionName(''); setEmotionEmoji('🙂'); setShowAddEmotionModal(true); }}>
              <Plus size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('add')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emotionGrid}>
            {emotions.map(e => (
              <View key={e.id} style={[styles.emotionPill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>{e.emoji}</Text>
                <Text style={{ color: colors.text }}>{t(e.name)}</Text>
                <TouchableOpacity onPress={() => removeEmotionTag(e.id)} style={{ marginLeft: 8 }}>
                  <Trash2 size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Card>

        {/* 使用统计 */}
        <Card padding={0}>
          <View style={styles.statsRow}>
            <View style={[styles.statsTile, { backgroundColor: '#EEF2FF' }]}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#3B82F6' }}>{emotions.length}</Text>
              <Text style={{ marginTop: 6, color: colors.textSecondary }}>{t('emotionTags')}</Text>
            </View>
            <View style={[styles.statsTile, { backgroundColor: '#ECFDF5' }]}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#10B981' }}>{getUsageDaysCount()}</Text>
              <Text style={{ marginTop: 6, color: colors.textSecondary }}>{t('usageDays')}</Text>
            </View>
          </View>
        </Card>

        {/* 底部说明 */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('appName')} {t('appVersion')}</Text>
          <Text style={[styles.footerSubText, { color: colors.textTertiary }]}>{t('appDescription')}</Text>
        </View>
      </ScrollView>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('theme')}</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {themes.map((theme) => (
                <TouchableOpacity
                  key={theme.mode}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, themeMode === theme.mode && { backgroundColor: colors.primary + '15' }]}
                  onPress={() => { setThemeMode(theme.mode); setShowThemeModal(false); }}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={styles.themeOption}>{theme.icon}<Text style={[styles.modalOptionText, { color: colors.text }]}>{theme.name}</Text></View>
                  </View>
                  {themeMode === theme.mode && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('language')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, language === lang.code && { backgroundColor: colors.primary + '15' }]}
                  onPress={() => { setLanguage(lang.code); setShowLanguageModal(false); }}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={styles.languageOption}>
                      <Text style={[styles.modalOptionText, { color: colors.text }]}>{lang.nativeName}</Text>
                      <Text style={[styles.modalOptionSubText, { color: colors.textSecondary }]}>{lang.name}</Text>
                    </View>
                  </View>
                  {language === lang.code && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal visible={showCurrencyModal} transparent animationType="fade" onRequestClose={() => setShowCurrencyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('currency')}</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {currencies.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, currency === curr.code && { backgroundColor: colors.primary + '15' }]}
                  onPress={() => {
                    setCurrency(curr.code);
                    if (curr.code === 'CNY' || curr.code === 'HKD' || curr.code === 'TWD') setLanguage('zh');
                    else if (curr.code === 'JPY') setLanguage('ja');
                    else if (curr.code === 'KRW') setLanguage('ko');
                    setShowCurrencyModal(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={styles.currencyOption}>
                      <Text style={[styles.currencySymbol, { color: colors.primary }]}>{curr.symbol}</Text>
                      <View>
                        <Text style={[styles.modalOptionText, { color: colors.text }]}>{getCurrencyName(curr.code, language)}</Text>
                        <Text style={[styles.modalOptionSubText, { color: colors.textSecondary }]}>{curr.code}</Text>
                      </View>
                    </View>
                  </View>
                  {currency === curr.code && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal visible={showImportModal} transparent animationType="fade" onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('importData')}</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text style={{ marginBottom: 8, color: colors.textSecondary }}>{t('pasteJsonBelow')}</Text>
              <TextInput
                style={[styles.importInput, { borderColor: colors.border, color: colors.text, backgroundColor: 'transparent' }]}
                placeholder={t('pasteJsonPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={importText}
                onChangeText={setImportText}
                multiline
              />
              <PrimaryButton
                label={t('startImport')}
                onPress={() => {
                  const res = importData(importText);
                  if (res.ok) { Alert.alert(t('importSuccess'), `${t('importedPrefix')}${res.imported}${t('importedSuffix')}`); setShowImportModal(false); setImportText(''); }
                  else { Alert.alert(t('importFailed'), res.error || t('checkJson')); }
                }}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Emotion Modal */}
      <Modal visible={showAddEmotionModal} transparent animationType="fade" onRequestClose={() => setShowAddEmotionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('addEmotionTag')}</Text>
              <TouchableOpacity onPress={() => setShowAddEmotionModal(false)}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text style={{ marginBottom: 6, color: colors.textSecondary }}>{t('emoji')}</Text>
              <TextInput
                style={[styles.importInput, { borderColor: colors.border, color: colors.text }]}
                placeholder={t('egEmoji')}
                placeholderTextColor={colors.textTertiary}
                value={emotionEmoji}
                onChangeText={setEmotionEmoji}
              />
              <Text style={{ marginTop: 12, marginBottom: 6, color: colors.textSecondary }}>{t('name')}</Text>
              <TextInput
                style={[styles.importInput, { borderColor: colors.border, color: colors.text }]}
                placeholder={t('egHappy')}
                placeholderTextColor={colors.textTertiary}
                value={emotionName}
                onChangeText={setEmotionName}
              />
              <PrimaryButton
                label={t('add')}
                onPress={() => {
                  if (!emotionName.trim()) { Alert.alert(t('pleaseEnterName')); return; }
                  addEmotionTag(emotionName.trim(), emotionEmoji || '🙂');
                  setShowAddEmotionModal(false);
                }}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  settingItem: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  actionItem: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  accountRow: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  accountText: { fontSize: 12, marginBottom: 6 },
  accountEmail: { fontSize: 16, fontWeight: '600' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingTitle: { fontSize: 16, fontWeight: '500' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingValue: { fontSize: 14, fontWeight: '500' },
  footer: { alignItems: 'center', paddingVertical: 28 },
  footerText: { fontSize: 14, fontWeight: '500' },
  footerSubText: { fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', maxWidth: 420, borderRadius: 16, maxHeight: '80%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContent: { maxHeight: 300 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalOptionContent: { flex: 1 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
  modalOptionSubText: { fontSize: 14, marginTop: 2 },
  themeOption: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  languageOption: { flex: 1 },
  currencyOption: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currencySymbol: { fontSize: 20, fontWeight: 'bold', minWidth: 32, textAlign: 'center' },
  importInput: { borderWidth: 1, minHeight: 100, borderRadius: 12, padding: 12, textAlignVertical: 'top' },

  emotionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  emotionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  emotionPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  statsRow: { flexDirection: 'row', gap: 12, padding: 16 },
  statsTile: { flex: 1, borderRadius: 12, padding: 14 },
});