import { useRouter, type Href } from 'expo-router';
import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, ThemedText, Card } from '@/components';
import { palette, radius, spacing } from '@/theme/tokens';

interface Item {
  label: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  href: Href;
}

const ITEMS: Item[] = [
  { label: 'Reports', description: 'Spend insights', icon: 'insights', href: '/reports' },
  { label: 'Recurring', description: 'Bills, EMIs, SIPs', icon: 'event-repeat', href: '/recurring' },
  { label: 'Categories', description: 'Manage categories', icon: 'category', href: '/categories' },
  { label: 'Receipts', description: 'Photos & vouchers', icon: 'receipt-long', href: '/receipts' },
  { label: 'SMS Import', description: 'Android only', icon: 'sms', href: '/sms-import' },
  { label: 'Backup & Export', description: 'Local backups, CSV', icon: 'backup', href: '/backup' },
  { label: 'Settings', description: 'Lock, theme, data', icon: 'settings', href: '/settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText variant="headlineMd">More</ThemedText>
        <ThemedText variant="bodySm" tone="muted">Reports, recurring, settings, and backup.</ThemedText>
      </View>
      <Card>
        {ITEMS.map((it, idx) => (
          <Pressable
            key={it.label}
            accessibilityRole="button"
            accessibilityLabel={it.label}
            onPress={() => router.push(it.href)}
            android_ripple={{ color: palette.outlineVariant }}
            style={({ pressed }) => [
              styles.row,
              idx > 0 && styles.rowDivider,
              pressed && { backgroundColor: palette.surfaceContainerLow },
            ]}
          >
            <View style={styles.iconBubble}>
              <MaterialIcons name={it.icon} size={22} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>{it.label}</ThemedText>
              <ThemedText variant="bodySm" tone="muted">{it.description}</ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={palette.onSurfaceVariant} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.lg, gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.outlineVariant },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
