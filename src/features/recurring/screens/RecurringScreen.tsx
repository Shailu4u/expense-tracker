import { useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Card, MoneyText, Button, CategoryIcon } from '@/components';
import { palette, spacing } from '@/theme/tokens';
import {
  useRecurring,
  useDueRuns,
  useSweepDue,
  useMarkPaid,
  useSkipRun,
  useDeleteRecurring,
} from '../hooks';
import { useCategories } from '@/features/categories/hooks';
import { fromISO } from '@/utils/date';

export function RecurringScreen() {
  const router = useRouter();
  const sweep = useSweepDue();
  const { data: items = [] } = useRecurring();
  const { data: due = [] } = useDueRuns();
  const { data: categories = [] } = useCategories({ includeHidden: true });
  const markPaid = useMarkPaid();
  const skip = useSkipRun();
  const remove = useDeleteRecurring();

  const catById = new Map(categories.map((c) => [c.id, c]));

  useEffect(() => {
    sweep.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ThemedText variant="headlineMd">Recurring</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          Bills, EMIs, SIPs and rent — set them once.
        </ThemedText>
      </View>

      <View style={styles.toolbar}>
        <Button label="Add recurring" onPress={() => router.push('/recurring/new')} />
      </View>

      {due.length > 0 && (
        <Card style={styles.dueCard}>
          <ThemedText variant="labelCaps" tone="muted">DUE NOW</ThemedText>
          {due.map((run) => {
            const r = items.find((i) => i.id === run.recurringId);
            const c = r ? catById.get(r.categoryId) : undefined;
            return (
              <View key={run.id} style={styles.dueRow}>
                <CategoryIcon icon={c?.icon ?? 'category'} color={c?.color ?? palette.outline} size={36} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
                    {r?.templateMeta?.merchant ?? c?.name ?? 'Recurring'}
                  </ThemedText>
                  <ThemedText variant="bodySm" tone="muted">
                    Due {fromISO(run.dueOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </ThemedText>
                </View>
                {r && <MoneyText paise={r.amountPaise} size="base" />}
                <View style={{ gap: 4 }}>
                  <Button label="Paid" onPress={() => markPaid.mutate(run.id)} />
                  <Button label="Skip" variant="ghost" onPress={() => skip.mutate(run.id)} />
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card style={{ marginHorizontal: spacing.containerMargin }}>
            <ThemedText variant="bodyBase" tone="muted">
              No recurring items yet.
            </ThemedText>
          </Card>
        }
        renderItem={({ item }) => {
          const c = catById.get(item.categoryId);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/recurring/[id]', params: { id: item.id } })}
              android_ripple={{ color: palette.outlineVariant }}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: palette.surfaceContainerLow },
              ]}
            >
              <CategoryIcon icon={c?.icon ?? 'category'} color={c?.color ?? palette.outline} size={40} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
                  {item.templateMeta?.merchant ?? c?.name ?? 'Recurring'}
                </ThemedText>
                <ThemedText variant="bodySm" tone="muted">
                  {item.cadence === 'weekly' ? 'Every week' : 'Every month'} ·
                  {' '}Next {fromISO(item.nextDue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {item.paused ? ' · Paused' : ''}
                </ThemedText>
              </View>
              <MoneyText paise={item.amountPaise} kind={item.kind} signed />
              <Pressable
                hitSlop={12}
                onPress={() => {
                  Alert.alert('Delete recurring?', 'Past transactions remain.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(item.id) },
                  ]);
                }}
              >
                <ThemedText variant="bodySm" tone="muted">Delete</ThemedText>
              </Pressable>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.containerMargin, paddingTop: spacing.lg, gap: spacing.xs },
  toolbar: { paddingHorizontal: spacing.containerMargin, paddingVertical: spacing.sm, alignItems: 'flex-start' },
  list: { paddingBottom: spacing.xl },
  dueCard: { marginHorizontal: spacing.containerMargin, marginBottom: spacing.sm, gap: spacing.sm },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.outlineVariant,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    minHeight: 64,
  },
});
