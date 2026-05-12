import { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Modal, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Card, TextField, Button, PaymentModePicker, CategoryPicker } from '@/components';
import { TransactionItem } from '../components/TransactionItem';
import { palette, radius, spacing } from '@/theme/tokens';
import { useTransactionsInRange } from '../hooks';
import { useCategories } from '@/features/categories/hooks';
import { monthRange, fromISO } from '@/utils/date';
import { formatINR } from '@/utils/money';
import type { TransactionRow } from '../repository';
import type { PaymentMode, TransactionKind } from '@/types';

export function TransactionsListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [kind, setKind] = useState<TransactionKind | 'all'>('all');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const range = useMemo(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 12);
    return { start: start.toISOString(), end: new Date().toISOString() };
  }, []);

  const { data, isLoading, error } = useTransactionsInRange({
    start: range.start,
    end: range.end,
    search: search.trim() || undefined,
    kind: kind === 'all' ? undefined : kind,
    paymentMode: paymentMode ?? undefined,
    categoryId: categoryId ?? undefined,
  });
  const { data: categories } = useCategories({ includeHidden: true });

  const catById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof categories>[number]>();
    (categories ?? []).forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const grouped = useMemo(() => groupByDay(data ?? []), [data]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ThemedText variant="headlineMd">Activity</ThemedText>
        <TextField
          placeholder="Search merchant or note"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search transactions"
        />
        <View style={styles.filterRow}>
          <Button
            label={`Filters${activeCount(kind, paymentMode, categoryId) ? ' · ' + activeCount(kind, paymentMode, categoryId) : ''}`}
            variant="secondary"
            onPress={() => setFilterOpen(true)}
          />
          {(kind !== 'all' || paymentMode || categoryId) && (
            <Button
              label="Clear"
              variant="ghost"
              onPress={() => {
                setKind('all');
                setPaymentMode(null);
                setCategoryId(null);
              }}
            />
          )}
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      )}
      {error && (
        <Card style={styles.statusCard}>
          <ThemedText variant="bodyBase" tone="error">
            Could not load transactions.
          </ThemedText>
        </Card>
      )}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card style={styles.statusCard}>
          <ThemedText variant="bodyBase" tone="muted">
            {search ? 'No transactions match your search.' : 'No transactions yet — tap “Add” to log your first one.'}
          </ThemedText>
        </Card>
      )}

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.day}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <ThemedText variant="labelCaps" tone="muted">{item.label}</ThemedText>
              <ThemedText variant="labelCaps" tone="muted">
                {formatINR(item.netPaise, { showZeroPaise: false })}
              </ThemedText>
            </View>
            <Card padded={false}>
              {item.items.map((t, i) => (
                <View key={t.id}>
                  {i > 0 && <View style={styles.sep} />}
                  <TransactionItem transaction={t} category={catById.get(t.categoryId)} />
                </View>
              ))}
            </Card>
          </View>
        )}
      />

      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)} />
        <View style={styles.sheet}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <ThemedText variant="headlineMd">Filters</ThemedText>

            <ThemedText variant="labelCaps" tone="muted">KIND</ThemedText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(['all', 'expense', 'income'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[styles.chip, kind === k && styles.chipActive]}
                >
                  <ThemedText variant="bodyBase" style={{ color: kind === k ? palette.onPrimary : palette.onSurface, fontWeight: '600' }}>
                    {k === 'all' ? 'All' : k === 'expense' ? 'Expenses' : 'Income'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText variant="labelCaps" tone="muted">PAYMENT MODE</ThemedText>
            <PaymentModePicker value={paymentMode ?? 'cash'} onChange={(m) => setPaymentMode(paymentMode === m ? null : m)} />
            {paymentMode && (
              <ThemedText variant="bodySm" tone="muted">Tap again to clear.</ThemedText>
            )}

            <ThemedText variant="labelCaps" tone="muted">CATEGORY</ThemedText>
            <CategoryPicker categories={categories ?? []} value={categoryId} onChange={(id) => setCategoryId(categoryId === id ? null : id)} />
            {categoryId && (
              <ThemedText variant="bodySm" tone="muted">Tap again to clear.</ThemedText>
            )}

            <Button label="Done" onPress={() => setFilterOpen(false)} fullWidth />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

function groupByDay(rows: TransactionRow[]) {
  const groups = new Map<string, { day: string; label: string; items: TransactionRow[]; netPaise: number }>();
  for (const r of rows) {
    const d = fromISO(r.occurredAt);
    const day = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const g = groups.get(day) ?? { day, label, items: [], netPaise: 0 };
    g.items.push(r);
    g.netPaise += r.kind === 'expense' ? -r.amountPaise : r.amountPaise;
    groups.set(day, g);
  }
  return Array.from(groups.values()).sort((a, b) => (a.day < b.day ? 1 : -1));
}

function activeCount(
  kind: TransactionKind | 'all',
  paymentMode: PaymentMode | null,
  categoryId: string | null,
): number {
  return (kind !== 'all' ? 1 : 0) + (paymentMode ? 1 : 0) + (categoryId ? 1 : 0);
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.containerMargin, paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  list: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  dayBlock: { gap: spacing.xs },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  sep: { height: 1, backgroundColor: palette.outlineVariant, marginLeft: spacing.md + 40 + spacing.md },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  statusCard: { marginHorizontal: spacing.containerMargin },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
  },
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceContainerLowest,
  },
  chipActive: { backgroundColor: palette.primaryContainer, borderColor: palette.primaryContainer },
});
