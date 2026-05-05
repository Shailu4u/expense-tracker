import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Screen, ThemedText, Card, MoneyText, Button, CategoryIcon, TextField } from '@/components';
import { palette, radius, spacing } from '@/theme/tokens';
import { monthRange } from '@/utils/date';
import { formatINR, rupeesToPaise } from '@/utils/money';
import { useBudgetsForMonth, useUpsertBudget, useDeleteBudget } from '../hooks';
import { useCategorySums, useMonthSum } from '@/features/transactions/hooks';
import { useCategories } from '@/features/categories/hooks';
import { startOfMonth } from 'date-fns';

export function BudgetsScreen() {
  const range = useMemo(() => monthRange(new Date()), []);
  const monthStart = useMemo(() => startOfMonth(new Date()).toISOString(), []);
  const { data: budgets = [] } = useBudgetsForMonth(monthStart);
  const { data: spent = 0 } = useMonthSum(range.start, range.end, 'expense');
  const { data: catSums = [] } = useCategorySums(range.start, range.end);
  const { data: categories = [] } = useCategories();
  const upsert = useUpsertBudget();
  const remove = useDeleteBudget();

  const overall = budgets.find((b) => b.scope === 'overall');
  const categoryBudgets = budgets.filter((b) => b.scope === 'category');
  const spentByCat = new Map(catSums.map((s) => [s.categoryId, s.totalPaise]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  const [overallInput, setOverallInput] = useState<string>('');
  const [catInputs, setCatInputs] = useState<Record<string, string>>({});

  async function saveOverall() {
    const val = Number(overallInput);
    if (!Number.isFinite(val) || val <= 0) {
      Alert.alert('Invalid amount', 'Enter a number greater than zero.');
      return;
    }
    await upsert.mutateAsync({
      scope: 'overall',
      period: 'monthly',
      amountPaise: rupeesToPaise(val),
      rollover: overall?.rollover ?? false,
      startsOn: monthStart,
    });
    setOverallInput('');
  }

  async function saveCategory(categoryId: string) {
    const v = catInputs[categoryId];
    const val = Number(v);
    if (!Number.isFinite(val) || val <= 0) return;
    await upsert.mutateAsync({
      scope: 'category',
      categoryId,
      period: 'monthly',
      amountPaise: rupeesToPaise(val),
      rollover: false,
      startsOn: monthStart,
    });
    setCatInputs((p) => ({ ...p, [categoryId]: '' }));
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ThemedText variant="headlineMd">Budgets</ThemedText>
          <ThemedText variant="bodySm" tone="muted">
            Set what you want to spend this month. We'll show progress, not nag.
          </ThemedText>
        </View>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">OVERALL</ThemedText>
          {overall ? (
            <BudgetRow
              label="This month"
              spent={spent}
              limit={overall.amountPaise}
              onRemove={() => {
                Alert.alert('Remove overall budget?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(overall.id) },
                ]);
              }}
            />
          ) : (
            <View style={styles.editRow}>
              <TextField
                placeholder="Amount in ₹"
                keyboardType="decimal-pad"
                value={overallInput}
                onChangeText={setOverallInput}
                accessibilityLabel="Overall budget amount"
              />
              <Button label="Set budget" onPress={saveOverall} loading={upsert.isPending} />
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">BY CATEGORY</ThemedText>
          {categoryBudgets.length === 0 && (
            <ThemedText variant="bodySm" tone="muted">No category budgets yet.</ThemedText>
          )}
          {categoryBudgets.map((b) => {
            const c = b.categoryId ? catById.get(b.categoryId) : undefined;
            const s = b.categoryId ? spentByCat.get(b.categoryId) ?? 0 : 0;
            return (
              <View key={b.id} style={styles.catBudgetRow}>
                <CategoryIcon icon={c?.icon ?? 'category'} color={c?.color ?? palette.outline} size={36} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
                    {c?.name ?? 'Category'}
                  </ThemedText>
                  <BudgetTrack spent={s} limit={b.amountPaise} />
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert(`Remove budget for ${c?.name ?? 'this category'}?`, undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(b.id) },
                    ]);
                  }}
                  hitSlop={12}
                >
                  <ThemedText variant="bodySm" tone="muted">Remove</ThemedText>
                </Pressable>
              </View>
            );
          })}

          <View style={styles.divider} />
          <ThemedText variant="labelCaps" tone="muted">ADD A CATEGORY BUDGET</ThemedText>
          {categories
            .filter((c) => c.kind !== 'income' && !categoryBudgets.find((b) => b.categoryId === c.id))
            .slice(0, 6)
            .map((c) => (
              <View key={c.id} style={styles.addCatRow}>
                <CategoryIcon icon={c.icon} color={c.color} size={32} />
                <ThemedText variant="bodyBase" style={{ flex: 1 }}>{c.name}</ThemedText>
                <TextField
                  placeholder="₹"
                  keyboardType="decimal-pad"
                  value={catInputs[c.id] ?? ''}
                  onChangeText={(t) => setCatInputs((p) => ({ ...p, [c.id]: t }))}
                />
                <Button label="Set" variant="secondary" onPress={() => saveCategory(c.id)} />
              </View>
            ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function BudgetRow({
  label,
  spent,
  limit,
  onRemove,
}: {
  label: string;
  spent: number;
  limit: number;
  onRemove: () => void;
}) {
  return (
    <View style={styles.budgetRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.budgetHeadRow}>
          <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
            {label}
          </ThemedText>
          <MoneyText paise={limit} size="base" />
        </View>
        <BudgetTrack spent={spent} limit={limit} />
      </View>
      <Pressable onPress={onRemove} hitSlop={12} style={{ paddingLeft: spacing.sm }}>
        <ThemedText variant="bodySm" tone="muted">Remove</ThemedText>
      </Pressable>
    </View>
  );
}

function BudgetTrack({ spent, limit }: { spent: number; limit: number }) {
  const used = Math.min(spent / Math.max(limit, 1), 1);
  const overBy = spent - limit;
  const tone: 'muted' | 'error' = used >= 1 ? 'error' : 'muted';
  return (
    <View>
      <View style={styles.track}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${used * 100}%`,
              backgroundColor: used >= 1 ? palette.error : used >= 0.8 ? palette.tertiary : palette.primary,
            },
          ]}
        />
      </View>
      <ThemedText variant="bodySm" tone={tone}>
        {used >= 1
          ? `Over by ${formatINR(overBy)}`
          : `${formatINR(spent)} of ${formatINR(limit)} used`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  header: { paddingTop: spacing.lg, gap: spacing.xs },
  card: { gap: spacing.sm },
  budgetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  budgetHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 8,
    backgroundColor: palette.surfaceContainerHigh,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  trackFill: { height: 8, borderRadius: radius.full },
  editRow: { gap: spacing.sm },
  catBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: { height: 1, backgroundColor: palette.outlineVariant, marginVertical: spacing.sm },
  addCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
