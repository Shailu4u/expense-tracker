import { Tabs, useRouter } from 'expo-router';
import { radius, spacing, typography, elevation } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { TabBarIcon } from '@/components/TabBarIcon';

export default function TabsLayout() {
  const { palette } = useTheme();
  const router = useRouter();
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
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Activity', tabBarIcon: ({ color, focused }) => <TabBarIcon name="list" color={color} focused={focused} /> }} />
      <Tabs.Screen
        name="add"
        options={{ title: 'Add', tabBarIcon: ({ color, focused }) => <TabBarIcon name="add" color={color} focused={focused} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            // Push a clean URL so a stale ?id= from a previous edit is cleared.
            router.push('/(tabs)/add');
          },
        }}
      />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets', tabBarIcon: ({ color, focused }) => <TabBarIcon name="budget" color={color} focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, focused }) => <TabBarIcon name="more" color={color} focused={focused} /> }} />
    </Tabs>
  );
}
