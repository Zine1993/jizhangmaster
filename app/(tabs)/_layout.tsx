import React, { useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Chrome as Home, List, ChartBar as BarChart3, Brain, Plus } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

import { View, Pressable, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width: screenWidth } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(state.index === 2 ? 0 : 1)).current;
  const tabWidth = screenWidth / state.routes.length;
  const dotWidth = 6;

  useEffect(() => {
    const targetValue = state.index * tabWidth + (tabWidth - dotWidth) / 2;
    Animated.timing(slideAnim, {
      toValue: targetValue,
      duration: 250,
      useNativeDriver: true,
    }).start();

    Animated.timing(indicatorOpacity, {
      toValue: state.index === 2 ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [state.index, tabWidth]);

  const onAddPress = () => {
    navigation.navigate('index', { showAddModal: 'true', from: 'tab' });
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBar, { backgroundColor: colors.tabBarBackground }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isAddButton = route.name === 'add';

          const onPress = () => {
            if (isAddButton) {
              onAddPress();
              return;
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          if (isAddButton) {
            return (
              <View key={route.key} style={styles.addButtonContainer}>
                <Pressable onPress={onPress} style={styles.addButtonPressable}>
                  <LinearGradient
                    colors={[colors.gradientFrom, colors.gradientTo]}
                    style={styles.addButtonGradient}
                  >
                    <Plus size={28} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              <View style={styles.iconContainer}>
                {options.tabBarIcon && options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? colors.primary : colors.textSecondary,
                  size: 24
                })}
              </View>
              <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.textSecondary }]}>
                {options.title}
              </Text>
            </Pressable>
          );
        })}
        <Animated.View style={[styles.indicator, {
          transform: [{ translateX: slideAnim }],
          opacity: indicatorOpacity,
          backgroundColor: colors.primary,
        }]} />
      </View>
    </View>
  );
};

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('transactions'),
          tabBarIcon: ({ size, color }) => <List size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('stats'),
          tabBarIcon: ({ size, color }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('insights'),
          tabBarIcon: ({ size, color }) => <Brain size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 95,
    justifyContent: 'flex-end',
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Default, will be overridden by theme
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    // No specific styles needed now
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  addButtonContainer: {
    flex: 1,
    alignItems: 'center',
  },
  addButtonPressable: {
    position: 'absolute',
    top: -45, // Elevates the button
  },
  addButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  indicator: {
    position: 'absolute',
    bottom: 5, // Positioned below the text
    height: 6,
    width: 6,
    borderRadius: 3,
  },
});