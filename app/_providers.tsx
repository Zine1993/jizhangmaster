import React from 'react';
import { EmotionTagProvider } from '@/contexts/EmotionTagContext';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <EmotionTagProvider>{children}</EmotionTagProvider>;
}