import { useRouter, type Href } from 'expo-router';
import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, ThemedText, Card, GradientPanel } from '@/components';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';

interface Item {
  label: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  href: Href;
}

const ITEMS: Item[] = [
  { label: 'Reports', description: 'Spend insights', icon: 'chart-donut', href: '/reports' },
  { label: 'Recurring', description: 'Bills, EMIs, SIPs', icon: 'calendar-clock-outline', href: '/recurring' },
  { label: 'Categories', description: 'Manage categories', icon: 'shape-outline', href: '/categories' },
  { label: 'Receipts', description: 'Photos & vouchers', icon: 'file-document-outline', href: '/receipts' },
  { label: 'SMS Import', description: 'Android only', icon: 'message-text-outline', href: '/sms-import' },
  { label: 'Backup & Export', description: 'Local backups, CSV', icon: 'database-export-outline', href: '/backup' },
  { label: 'Settings', description: 'Lock, theme, data', icon: 'cog-outline', href: '/settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { palette } = useTheme();

  return (
    <Screen scroll>
      <GradientPanel style={styles.header}>
        <ThemedText variant="labelCaps" tone="inverse">MORE</ThemedText>
        <ThemedText variant="headlineMd" tone="inverse">Everything beyond the daily ledger.</ThemedText>
        <ThemedText variant="bodySm" tone="inverse">Reports, recurring, settings, and backup.</ThemedText>
      </GradientPanel>
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
              idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.outlineVariant },
              pressed && { backgroundColor: palette.surfaceContainerLow },
            ]}
          >
            <View style={[styles.iconBubble, { backgroundColor: palette.tabActive }]}>
              <MaterialCommunityIcons name={it.icon} size={22} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>{it.label}</ThemedText>
              <ThemedText variant="bodySm" tone="muted">{it.description}</ThemedText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={palette.onSurfaceVariant} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, minHeight: 56 },
  iconBubble: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
