import React, { ReactNode, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  height?: number;
  children?: ReactNode;
  variant?: 'default' | 'userInfo';
};

export default function GradientHeader({ title, subtitle, right, height = 140, children, variant = 'default' }: Props) {
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

  const displayHeight = variant === 'userInfo' ? 120 : height;

  return (
    <View style={{ backgroundColor: colors.background }}>
      <LinearGradient
        colors={[colors.gradientFrom, colors.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { height: displayHeight }]}
      >
        {variant === 'userInfo' ? (
          <View style={styles.userWrap}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.title}>{t('greetTitle')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  <Text style={styles.subtitle}>{user ? maskEmail(user.email || '') : t('guestSubtitle')}</Text>
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
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              {!!title && <Text style={styles.title}>{title}</Text>}
              {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {right}
          </View>
        )}
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    fontSize: 14,
  },
  userWrap: {
    width: '92%',
    alignSelf: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 30,
  },
  logoutInline: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginLeft: 8,
  },
});
