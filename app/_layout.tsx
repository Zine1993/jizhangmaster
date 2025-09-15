import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TransactionProvider } from '@/contexts/TransactionContext';
import { EmojiRainProvider } from '@/contexts/EmojiRainContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import AuthGate from '@/components/AuthGate';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { EmotionTagProvider } from '@/contexts/EmotionTagContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <UserProvider>
          <SafeAreaProvider>
            <ThemeProvider>
              <LanguageProvider>
                <EmotionTagProvider>
                  <TransactionProvider>
                    <EmojiRainProvider>
                      <AuthGate>
                        <Stack screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="(tabs)" />
                          <Stack.Screen name="onboarding" />
                          <Stack.Screen name="+not-found" />
                        </Stack>
                        <StatusBar style="auto" />
                      </AuthGate>
                    </EmojiRainProvider>
                  </TransactionProvider>
                </EmotionTagProvider>
              </LanguageProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </UserProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}