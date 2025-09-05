import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { StatusBar as ExpoStatusBar, setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  title?: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  height?: number;
  children?: ReactNode;
  variant?: 'default' | 'userInfo';
  centered?: boolean;
  centerTitle?: boolean;
  childrenFirst?: boolean;
  shape?: 'flat' | 'wave';
};

const StatusBarSync = ({ color }: { color: string }) => {
  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
  }, [color]));
  return (
    <ExpoStatusBar
      style="light"
      animated
    />
  );
};

export default function GradientHeader({ title, subtitle, left, right, height = 100, children, variant = 'default', centered = false, centerTitle = false, childrenFirst = false, shape = 'wave' }: Props) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { getEmotionStats } = useTransactions();
  const { t } = useLanguage();
  const [avatarEmoji, setAvatarEmoji] = useState('😊');

  useEffect(() => {
    const updateEmoji = () => {
      try {
        const stats = getEmotionStats?.() || [];
        setAvatarEmoji(stats[0]?.emoji || '😊');
      } catch {
        setAvatarEmoji('😊');
      }
    };
    updateEmoji();
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeout = setTimeout(updateEmoji, midnight.getTime() - now.getTime());
    return () => clearTimeout(timeout);
  }, [getEmotionStats]);

  const maskEmail = (email?: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const masked = name.length <= 3 ? name[0] + '***' : name.slice(0, 3) + '***';
    return `${masked}@${domain}`;
  };

  const insets = useSafeAreaInsets();
  const displayHeight = Math.max(0, (variant === 'userInfo' ? 81 : height) - 5);

  return (
    <View style={{ backgroundColor: colors.background }}>
      <StatusBarSync color={colors.gradientFrom} />
      <LinearGradient
        colors={[colors.gradientFrom, colors.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top }}
      />
      <LinearGradient
        colors={[colors.gradientFrom, colors.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { height: displayHeight + insets.top + 4, marginTop: -insets.top, paddingLeft: variant === 'userInfo' ? 5 : undefined }]}
      >
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          {variant === 'userInfo' ? (
            <View style={styles.userWrap}>
              <View style={styles.userRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
                  </View>
                  <View style={{ marginLeft: 12, marginTop: -6, flexShrink: 1 }}>
                    <Text style={[styles.title, { fontSize: 16 }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} allowFontScaling>{t('slogan')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                      {user ? (
                        <View style={[styles.emailBadge, { marginLeft: 0, flexDirection: 'row', alignItems: 'center' }]}>
                          <Mail size={14} color="#fff" />
                          <Text style={[styles.subtitle, { fontSize: 14, marginLeft: 6 }]}>{maskEmail(user.email || '')}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.subtitle, { fontSize: 14, marginLeft: 0 }]}>{t('guestSubtitle')}</Text>
                      )}
                      {user ? (
                        <TouchableOpacity
                          onPress={() => { signOut?.(); }}
                          style={styles.logoutInline}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.logoutText}>{t('logout')}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
                {right}
              </View>
            </View>
          ) : (
            <View>
              {childrenFirst && children}
              <View style={[styles.headerRow, centered && styles.centeredRow]}>
                {centered ? <View style={styles.leftAbsolute}>{left}</View> : left}
                <View style={centered ? styles.centeredContainer : { flex: 1, marginHorizontal: left || right ? 12 : 0 }}>
                  {!!title && <Text style={[styles.title, centered && styles.titleCentered, centerTitle && { textAlign: 'center' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} allowFontScaling>{title}</Text>}
                  {!!subtitle && <Text style={[styles.subtitle, centered && styles.subtitleCentered, centerTitle && { textAlign: 'center' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} allowFontScaling>{subtitle}</Text>}
                </View>
                {!centered && right}
              </View>
              {!childrenFirst && children}
            </View>
          )}
        </View>
        {shape === 'wave' && (
          <View pointerEvents="none" style={styles.waveWrap}>
            <Svg width="100%" height="28" viewBox="0 0 1440 56" preserveAspectRatio="none">
              <Path
                d="M0,28 C240,56 480,0 720,28 C960,56 1200,0 1440,28 L1440,56 L0,56 Z"
                fill={colors.background}
              />
            </Svg>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    // 使用波浪底边时不再需要底部圆角
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontSize: 12,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  centeredRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCentered: {
    textAlign: 'center',
    fontSize: 26,
  },
  subtitleCentered: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
  },
  centeredContainer: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
  },
  leftAbsolute: {
    position: 'absolute',
    left: 0,
  },
  userWrap: {
    width: '100%',
    alignSelf: 'stretch',
    paddingLeft: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginLeft: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  logoutInline: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginLeft: 8,
  },
  emailBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  waveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 28,
  },
});
