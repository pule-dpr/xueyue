import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/AppIcon';
import { colors, type } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: '#8B969E',
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => <AppIcon name="home" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '找拼车',
          tabBarIcon: ({ color }) => <AppIcon name="search" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: '',
          tabBarAccessibilityLabel: '发布拼车',
          tabBarIcon: () => (
            <View style={styles.add}>
              <AppIcon name="plus" color={colors.white} size={22} strokeWidth={2.2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: '行程',
          tabBarIcon: ({ color }) => <AppIcon name="calendar" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <AppIcon name="profile" color={color} size={21} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 9,
    backgroundColor: 'rgba(255,255,255,.97)',
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  item: {
    paddingVertical: 2,
  },
  label: {
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  add: {
    width: 45,
    height: 45,
    marginTop: -18,
    borderRadius: 14,
    backgroundColor: colors.berry,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B2535',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
});
