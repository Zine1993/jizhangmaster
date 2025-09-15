import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

const supabase = getSupabase();

interface UserContextType {
  user: any;
  loading: boolean;
  onboarded: boolean;
  finishOnboarding: (nickname: string, currency: string, accountName: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const onboardedStatus = await AsyncStorage.getItem(`onboarded_${session.user.id}`);
          if (onboardedStatus === 'true') {
            setOnboarded(true);
          }
        }
      } catch (error) {
        console.error('Error checking user session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const finishOnboarding = async (nickname: string, currency: string, accountName: string) => {
    if (!user) return;
    try {
      // 1. Update user metadata (nickname)
      await supabase.auth.updateUser({ data: { nickname } });

      // 2. Create a default account for the user
      const { error: accountError } = await supabase
        .from('accounts')
        .insert([{ user_id: user.id, name: accountName, currency, balance: 0 }]);
      
      if (accountError) throw accountError;

      // 3. Set default currency in user's profile (optional, if you have a profiles table)
      //    This might be redundant if you always look up currency from the account.

      // 4. Mark onboarding as complete
      await AsyncStorage.setItem(`onboarded_${user.id}`, 'true');
      setOnboarded(true);
    } catch (error) {
      console.error('Error finishing onboarding:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, onboarded, finishOnboarding }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};