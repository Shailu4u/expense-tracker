import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Button, Card } from '@/components';
import { palette, radius, spacing, typography } from '@/theme/tokens';
import * as Settings from '@/features/settings/repository';

export default function Setup() {
  const router = useRouter();
  const [day, setDay] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  async function next() {
    setBusy(true);
    try {
      await Settings.update({ monthStartDay: day });
      router.push('/(onboarding)/lock');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded scroll>
      <View style={styles.head}>
        <ThemedText variant="labelCaps" tone="primary">SETUP</ThemedText>
        <ThemedText variant="headlineMd">When does your month start?</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          Most people pick the 1st. Salary on the 25th? Pick that and budgets follow your pay cycle.
        </ThemedText>
      </View>

      <Card style={styles.card}>
        <ThemedText variant="labelCaps" tone="muted">MONTH STARTS ON</ThemedText>
        <View style={styles.grid}>
          {COMMON_DAYS.map((d) => (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`Day ${d}`}
              onPress={() => setDay(d)}
              style={[styles.chip, day === d && styles.chipActive]}
            >
              <ThemedText
                variant="bodyBase"
                style={[styles.chipText, day === d && styles.chipTextActive]}
              >
                {d}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText variant="bodySm" tone="muted">Selected: {day} of every month</ThemedText>
      </Card>

      <View style={styles.cta}>
        <Button label="Continue" onPress={next} loading={busy} fullWidth />
      </View>
    </Screen>
  );
}

const COMMON_DAYS = [1, 5, 10, 15, 20, 25, 28];

const styles = StyleSheet.create({
  head: { paddingTop: spacing.xl, gap: spacing.xs },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 48,
    minWidth: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceContainerLowest,
  },
  chipActive: {
    backgroundColor: palette.primaryContainer,
    borderColor: palette.primaryContainer,
  },
  chipText: { ...typography.bodyBase, fontWeight: '600' },
  chipTextActive: { color: palette.onPrimary },
  cta: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
});
