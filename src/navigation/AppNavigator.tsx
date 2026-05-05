import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthStore } from '../store/authStore';
import { DailyLogScreen } from '../screens/DailyLogScreen';
import { FoodLogScreen } from '../screens/FoodLogScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SyncHealthScreen } from '../screens/SyncHealthScreen';
import { VoiceLogScreen } from '../screens/VoiceLogScreen';

export type AppTab =
  | 'Home'
  | 'Sync'
  | 'Daily'
  | 'Food'
  | 'Voice'
  | 'Reports'
  | 'Settings';

const tabs: Array<{ key: Exclude<AppTab, 'Sync'>; icon: string }> = [
  { key: 'Home', icon: 'H' },
  { key: 'Daily', icon: 'D' },
  { key: 'Food', icon: 'F' },
  { key: 'Voice', icon: 'V' },
  { key: 'Reports', icon: 'R' },
  { key: 'Settings', icon: 'S' },
];

export function AppNavigator() {
  const { initialized, user, initialize } = useAuthStore();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<AppTab>('Home');

  useEffect(() => initialize(), [initialize]);

  const screen = useMemo(() => {
    const navigate = (tab: AppTab) => setActiveTab(tab);

    switch (activeTab) {
      case 'Sync':
        return <SyncHealthScreen />;
      case 'Daily':
        return <DailyLogScreen />;
      case 'Food':
        return <FoodLogScreen />;
      case 'Voice':
        return <VoiceLogScreen />;
      case 'Reports':
        return <ReportsScreen />;
      case 'Settings':
        return <SettingsScreen />;
      case 'Home':
      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  }, [activeTab]);

  if (!initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563EB" />
        <Text className="mt-3 text-sm text-[#6B7280]">Loading RAMonitor</Text>
      </View>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <LoginScreen onShowRegister={() => setAuthMode('register')} />
    ) : (
      <RegisterScreen onShowLogin={() => setAuthMode('login')} />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContainer}>{screen}</View>
      <View style={styles.tabBar}>
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const selected = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabButton}
              >
                <View
                  style={[
                    styles.tabIcon,
                    selected ? styles.tabIconActive : styles.tabIconInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabIconText,
                      selected
                        ? styles.tabIconTextActive
                        : styles.tabIconTextInactive,
                    ]}
                  >
                    {tab.icon}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    selected ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {tab.key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingBottom: 86,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabIcon: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabIconActive: {
    backgroundColor: '#2563EB',
  },
  tabIconInactive: {
    backgroundColor: '#FFFFFF',
  },
  tabIconText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabIconTextActive: {
    color: '#FFFFFF',
  },
  tabIconTextInactive: {
    color: '#6B7280',
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#2563EB',
  },
  tabLabelInactive: {
    color: '#6B7280',
  },
});
