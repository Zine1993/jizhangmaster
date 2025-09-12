import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';

export default function EmotionsRouteRedirect() {
  // 将旧路径重定向到设置下的新页面
  return <Redirect href="/settings/emotions" />;
}