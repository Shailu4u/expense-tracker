import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Modal, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, ThemedText, Card, TextField, Button, PaymentModePicker, CategoryPicker } from '@/components';
import { TransactionItem } from '../components/TransactionItem';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { useTransactionsInRange } from '../hooks';
import { useCategories } from '@/features/categories/hooks';
import { fromISO } from '@/utils/date';
import { formatINR } from '@/utils/money';
import type { TransactionRow } from '../repository';
import type { PaymentMode, TransactionKind } from '@/types';

type DatePreset = 'today' | 'week' | 'month' | 'last_month' | 'quarter' | 'year';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'quarter', label: 'Last 3 months' },
  { value: 'year', label: 'Last 12 months' },
];

function getPresetRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  switch (preset) {
    case 'today': {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      return { start: s.toISOString(), end };
    }
    case 'week': {
      const s = new Date(now);
      s.setDate(now.getDate() - 7);
      return { start: s.toISOString(), end };
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s.toISOString(), end };
    }
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    case 'quarter': {
      const s = new Date(now);
      s.setMonth(now.getMonth() - 3);
      return { start: s.toISOString(), end };
    }
    case 'year':
    default: {
      const s = new Date(now);
      s.setMonth(now.getMonth() - 12);
      return { start: s.toISOString(), end };
    }
  }
}

export function TransactionsListScreen() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ categoryId?: string; search?: string }>();
  const [search, setSearch] = useState(params.search ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const [kind, setKind] = useState<TransactionKind | 'all'>('all');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [datePreset, setDatePreset] = useState<DatePreset>('year');

  // Tab screens stay mounted — params update reactively but useState initializers
  // only run once, so we sync incoming params into local state on each change.
  useEffect(() => {
    if (params.categoryId !== undefined) setCategoryId(params.categoryId || null);
  }, [params.categoryId]);

  useEffect(() => {
    if (params.search !== undefined) setSearch(params.search || '');
  }, [params.search]);

  const range = useMemo(() => getPresetRange(datePreset), [datePreset]);

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

  const filterCount = activeCount(kind, paymentMode, categoryId, datePreset);

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
            label={`Filters${filterCount ? ' · ' + filterCount : ''}`}
            variant="secondary"
            onPress={() => setFilterOpen(true)}
          />
          {filterCount > 0 && (
            <Button
              label="Clear"
              variant="ghost"
              onPress={() => {
                setKind('all');
                setPaymentMode(null);
                setCategoryId(null);
                setDatePreset('year');
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
            {search ? 'No transactions match your search.' : 'No transactions yet — tap "Add" to log your first one.'}
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
                  {i > 0 && <View style={[styles.sep, { backgroundColor: palette.outlineVariant }]} />}
                  <TransactionItem transaction={t} category={catById.get(t.categoryId)} />
                </View>
              ))}
            </Card>
          </View>
        )}
      />

      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <ThemedText variant="headlineMd">Filters</ThemedText>

            <ThemedText variant="labelCaps" tone="muted">DATE RANGE</ThemedText>
            <View style={styles.chipWrap}>
              {DATE_PRESETS.map((p) => (
                <Pressable
                  key={p.value}
                  onPress={() => setDatePreset(p.value)}
                  style={[
                    styles.chip,
                    { borderColor: palette.outlineVariant, backgroundColor: palette.surfaceContainerLowest },
                    datePreset === p.value && { backgroundColor: palette.primaryContainer, borderColor: palette.primaryContainer },
                  ]}
                >
                  <ThemedText
                    variant="bodySm"
                    style={{ color: datePreset === p.value ? palette.onPrimary : palette.onSurface, fontWeight: datePreset === p.value ? '600' : '400' }}
                  >
                    {p.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText variant="labelCaps" tone="muted">KIND</ThemedText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(['all', 'expense', 'income'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[
                    styles.chip,
                    { borderColor: palette.outlineVariant, backgroundColor: palette.surfaceContainerLowest },
                    kind === k && { backgroundColor: palette.primaryContainer, borderColor: palette.primaryContainer },
                  ]}
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
    // Use local date components so IST midnight-crossings don't split the same
    // calendar day into two UTC-keyed groups.
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  datePreset: DatePreset,
): number {
  return (kind !== 'all' ? 1 : 0) + (paymentMode ? 1 : 0) + (categoryId ? 1 : 0) + (datePreset !== 'year' ? 1 : 0);
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.containerMargin, paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  list: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  dayBlock: { gap: spacing.xs },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  sep: { height: 1, marginLeft: spacing.md + 40 + spacing.md },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  statusCard: { marginHorizontal: spacing.containerMargin },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
