import React, { useMemo, useState, ReactNode, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView, Platform, Dimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LogIn, UserPlus, KeyRound, ArrowLeft, Heart, BarChart3, Brain, Shield } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Input from '@/components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Mode = 'login' | 'register' | 'reset';

export default function AuthGate({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, skipped, signInWithPassword, signUpWithPassword, resetPassword, skipLogin } = useAuth();
  const { onboarded, loading: userLoading } = useUser();
  const { colors } = useTheme();
  const { t } = useLanguage();
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const prevBodyMargin = document.body.style.margin;
      const prevBodyBg = document.body.style.backgroundColor;
      const prevHtmlBg = document.documentElement.style.backgroundColor;
      document.body.style.margin = '0px';
      document.body.style.backgroundColor = '#FFF1F7';
      document.documentElement.style.backgroundColor = '#FFF1F7';
      return () => {
        document.body.style.margin = prevBodyMargin;
        document.body.style.backgroundColor = prevBodyBg;
        document.documentElement.style.backgroundColor = prevHtmlBg;
      };
    }
  }, []);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (mode === 'reset') return email.trim().length > 0;
    if (mode === 'register') return email.trim().length > 0 && password.length >= 6 && confirmPassword.length >= 6;
    return email.trim().length > 0 && password.length >= 6;
  }, [busy, mode, email, password, confirmPassword]);

  const handleSubmit = async () => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await signInWithPassword(email.trim(), password);
        if (!res.ok) {
          // 如果是云同步未配置的错误，不显示错误消息
          if (res.error?.includes('Cloud sync is not configured')) {
            // 继续执行，不显示错误
          } else {
            setErr(res.error || t('loginFailed'));
          }
        }
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          setErr(t('passwordMismatch'));
          return;
        }
        const res = await signUpWithPassword(email.trim(), password);
        if (!res.ok) {
          // 如果是云同步未配置的错误，显示本地注册成功消息
          if (res.error?.includes('Cloud sync is not configured')) {
            setMsg(t('registerSuccessLocal'));
            setPassword('');
            setConfirmPassword('');
            setMode('login');
          } else {
            setErr(res.error || t('registerFailed'));
          }
        }
        else {
          setMsg(t('registerSuccessCheckEmail'));
          setPassword('');
          setConfirmPassword('');
          setMode('login');
        }
      } else if (mode === 'reset') {
        const res = await resetPassword(email.trim());
        if (!res.ok) {
          // 如果是云同步未配置的错误，不显示错误消息，直接视为重置邮件发送成功
          if (res.error?.includes('Cloud sync is not configured')) {
            setMsg(t('resetEmailSent'));
            setMode('login');
          } else {
            setErr(res.error || t('resetEmailFailed'));
          }
        }
        else {
          setMsg(t('resetEmailSent'));
          setMode('login');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || userLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (user && !onboarded) {
    return <Redirect href="/onboarding" />;
  }

  if (user || skipped) {
    return <>{children}</>;
  }

  const title = t('appName');
  const subtitle = t('slogan');
  const screenHeight = Dimensions.get('window').height;

  const GradientText = ({ children, style }: { children: ReactNode; style?: any }) => {
    if (Platform.OS === 'web') {
      return (
        <Text
          style={[
            style,
            {
              backgroundImage: 'linear-gradient(90deg, #A855F7, #F43F5E)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            },
          ]}
        >
          {children}
        </Text>
      );
    }
    return (
      <MaskedView
        maskElement={<Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>}
      >
        <LinearGradient colors={['#A855F7', '#F43F5E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={[style, { opacity: 0 }]}>{children}</Text>
        </LinearGradient>
      </MaskedView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF1F7' }}>
      <StatusBar
        style="dark"
      />
      <View style={{ height: insets.top, backgroundColor: '#FFF1F7' }} />
      <ScrollView
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1, minHeight: screenHeight }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.noHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}><Text style={styles.emoji}>🌈</Text></View>
          </View>
          <View style={styles.headerTexts}>
            {!!title && <GradientText style={styles.headerTitle}>{title}</GradientText>}
            {!!subtitle && <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
          </View>
        </View>

        <Card padding={0}>
          <View style={{ padding: 20 }}>
            <View style={styles.welcomeRow}>
              <Heart size={16} color={colors.primary} />
              <Text style={[styles.welcome, { color: colors.text }]}>
                {mode === 'login'
                  ? t('welcomeBack')
                  : mode === 'register'
                  ? t('createAccount')
                  : t('resetPassword')}
              </Text>
            </View>

            {!!err && <Text style={[styles.error, { color: colors.error }]}>{err}</Text>}
            {!!msg && <Text style={[styles.message, { color: colors.text }]}>{msg}</Text>}

            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('emailLabel')}</Text>
            <Input
              placeholder={t('emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {mode !== 'reset' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('passwordLabel')}</Text>
                <Input
                  placeholder={t('passwordPlaceholder')}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                {mode === 'register' && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('confirmPasswordLabel')}</Text>
                    <Input
                      placeholder={t('confirmPasswordPlaceholder')}
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </>
                )}
              </>
            )}

            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                label={
                  mode === 'login'
                    ? t('login')
                    : mode === 'register'
                    ? t('register')
                    : t('sendResetEmail')
                }
                onPress={handleSubmit}
                disabled={!canSubmit}
              />
            </View>

            <View style={styles.linksRow}>
              {mode !== 'login' && (
                <TouchableOpacity onPress={() => { setMode('login'); setErr(null); setMsg(null); }}>
                  <Text style={[styles.link, { color: colors.primary }]}>{t('backToLogin')}</Text>
                </TouchableOpacity>
              )}
              {mode !== 'register' && (
                <TouchableOpacity onPress={() => { setMode('register'); setErr(null); setMsg(null); }}>
                  <Text style={[styles.link, { color: colors.primary }]}>{t('goRegister')}</Text>
                </TouchableOpacity>
              )}
              {mode !== 'reset' && (
                <TouchableOpacity onPress={() => { setMode('reset'); setErr(null); setMsg(null); }}>
                  <Text style={[styles.link, { color: colors.primary }]}>{t('forgotPassword')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.quickBox, { borderColor: '#FDBA74' + '66', backgroundColor: '#FFEDD5' }]}>
              <Text style={[styles.quickTitle, { color: '#EA580C' }]}>{t('quickTryTitle')}</Text>
              <Text style={[styles.quickDesc, { color: '#9A3412' }]}>{t('quickTryDesc')}</Text>
              <TouchableOpacity style={styles.quickBtn} onPress={skipLogin}>
                <ArrowLeft size={16} color={'#EA580C'} />
                <Text style={[styles.quickBtnText, { color: '#EA580C' }]}>{' '}{t('skipForNow')}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </Card>

        <View style={styles.featuresRow}>
          <View style={[styles.feature, { backgroundColor: colors.surface }]}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '15' }]}>
              <BarChart3 size={18} color={colors.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>{t('featureAnalytics')}</Text>
            <Text style={[styles.featureSub, { color: colors.textTertiary }]}>{t('featureAnalyticsSub')}</Text>
          </View>
          <View style={[styles.feature, { backgroundColor: colors.surface }]}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '15' }]}>
              <Brain size={18} color={colors.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>{t('featureInsights')}</Text>
            <Text style={[styles.featureSub, { color: colors.textTertiary }]}>{t('featureInsightsSub')}</Text>
          </View>
          <View style={[styles.feature, { backgroundColor: colors.surface }]}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '15' }]}>
              <Shield size={18} color={colors.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>{t('featurePrivacy')}</Text>
            <Text style={[styles.featureSub, { color: colors.textTertiary }]}>{t('featurePrivacySub')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { alignItems: 'center', marginTop: 4 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  emoji: { fontSize: 16 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  welcome: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 13, marginBottom: 6 },
  linksRow: { marginTop: 12, flexDirection: 'row', gap: 16, justifyContent: 'center' },
  link: { fontSize: 14 },
  error: { textAlign: 'center', marginBottom: 6 },
  message: { textAlign: 'center', marginBottom: 6 },
  quickBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  quickTitle: { fontSize: 14, fontWeight: '700' },
  quickDesc: { fontSize: 12, marginTop: 4 },
  quickBtn: { alignSelf: 'flex-start', marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  quickBtnText: { fontSize: 13, fontWeight: '600' },
  demoBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  demoTitle: { fontSize: 14, fontWeight: '700' },
  demoRow: { marginTop: 4, fontSize: 13 },
  featuresRow: {
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 12,
    flexDirection: 'row',
  },
  feature: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  featureTitle: { fontWeight: '700', fontSize: 14 },
  featureSub: { fontSize: 12, marginTop: 4 },
  featureIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  noHeader: {
    paddingHorizontal: 16,
    paddingTop: 3,
    paddingBottom: 3,
  },
  headerTexts: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 3 },
});
