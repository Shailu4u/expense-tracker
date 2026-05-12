import { Tabs } from 'expo-router';
import { palette, radius, spacing, typography, elevation } from '@/theme/tokens';
import { TabBarIcon } from '@/components/TabBarIcon';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.onSurfaceVariant,
        sceneStyle: { backgroundColor: palette.background },
        tabBarStyle: {
          backgroundColor: palette.tabSurface,
          borderTopColor: palette.tabBorder,
          borderTopWidth: 1,
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
          paddingHorizontal: spacing.sm,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          ...elevation.card,
        },
        tabBarLabelStyle: { ...typography.labelCaps, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="list" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="add" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="budget" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="more" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
