import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter, useSegments, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, spacing, typography, elevation } from '@/theme/tokens';
import { ThemedText } from './ThemedText';
import { TabBarIcon } from './TabBarIcon';

type NavKey = 'home' | 'transactions' | 'add' | 'budgets' | 'more';

const ITEMS: { key: NavKey; label: string; href: Href }[] = [
  { key: 'home', label: 'Home', href: '/(tabs)/home' },
  { key: 'transactions', label: 'Activity', href: '/(tabs)/transactions' },
  { key: 'add', label: 'Add', href: '/(tabs)/add' },
  { key: 'budgets', label: 'Budgets', href: '/(tabs)/budgets' },
  { key: 'more', label: 'More', href: '/(tabs)/more' },
];

export function AppFooterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const active = activeItem(pathname, segments);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {ITEMS.map((item) => {
          const focused = active === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: focused }}
              onPress={() => router.push(item.href)}
              style={[styles.item, focused && styles.itemActive, item.key === 'add' && styles.addItem]}
            >
              <TabBarIcon name={iconName(item.key)} color={focused ? palette.primary : palette.onSurfaceVariant} focused={focused} />
              <ThemedText
                variant="labelCaps"
                style={[styles.label, { color: focused ? palette.primary : palette.onSurfaceVariant }]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function iconName(key: NavKey): 'home' | 'list' | 'add' | 'budget' | 'more' {
  switch (key) {
    case 'home':
      return 'home';
    case 'transactions':
      return 'list';
    case 'add':
      return 'add';
    case 'budgets':
      return 'budget';
    case 'more':
      return 'more';
  }
}

function activeItem(pathname: string, segments: string[]): NavKey {
  if (segments[0] === '(tabs)') {
    if (segments[1] === 'transactions') return 'transactions';
    if (segments[1] === 'add') return 'add';
    if (segments[1] === 'budgets') return 'budgets';
    if (segments[1] === 'more') return 'more';
    return 'home';
  }
  if (segments[0] === 'transactions') return 'transactions';
  if (pathname.startsWith('/transactions')) return 'transactions';
  if (segments[0] === 'reports' || segments[0] === 'settings' || segments[0] === 'categories' || segments[0] === 'backup' || segments[0] === 'receipts' || segments[0] === 'recurring' || segments[0] === 'sms-import') {
    return 'more';
  }
  return 'home';
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.containerMargin,
    right: spacing.containerMargin,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: palette.tabSurface,
    borderWidth: 1,
    borderColor: palette.tabBorder,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...elevation.card,
  },
  item: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
  },
  itemActive: {
    backgroundColor: palette.tabActive,
  },
  addItem: {
    minHeight: 60,
  },
  label: {
    ...typography.labelCaps,
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
