import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Screen, ThemedText, Card, MoneyText, Button, CategoryIcon, TextField, GradientPanel } from '@/components';
import { palette, radius, spacing } from '@/theme/tokens';
import { budgetCycleRange } from '@/utils/date';
import { formatINR, rupeesToPaise } from '@/utils/money';
import { useBudgetsForMonth, useUpsertBudget, useDeleteBudget } from '../hooks';
import type { Budget } from '../repository';
import { useCategorySums, useMonthSum } from '@/features/transactions/hooks';
import { useCategories } from '@/features/categories/hooks';
import type { Category } from '@/features/categories/repository';
import { useSettings } from '@/features/security/hooks';

export function availableBudgetCategories(categories: Category[], budgets: Budget[]): Category[] {
  const budgetedCategoryIds = new Set(
    budgets
      .filter((budget) => budget.scope === 'category' && budget.categoryId)
      .map((budget) => budget.categoryId),
  );

  return categories.filter(
    (category) =>
      category.hiddenAt === null &&
      category.kind !== 'income' &&
      !budgetedCategoryIds.has(category.id),
  );
}

export function BudgetsScreen() {
  const { data: settings } = useSettings();
  const monthStartDay = settings?.monthStartDay ?? 1;
  const range = useMemo(() => budgetCycleRange(new Date(), monthStartDay), [monthStartDay]);
  const monthStart = range.start;
  const { data: budgets = [] } = useBudgetsForMonth(monthStart);
  const { data: spent = 0 } = useMonthSum(range.start, range.end, 'expense');
  const { data: catSums = [] } = useCategorySums(range.start, range.end);
  const { data: categories = [] } = useCategories({ includeHidden: true });
  const upsert = useUpsertBudget();
  const remove = useDeleteBudget();

  const overall = budgets.find((b) => b.scope === 'overall');
  const categoryBudgets = budgets.filter((b) => b.scope === 'category');
  const availableCategories = useMemo(
    () => availableBudgetCategories(categories, categoryBudgets),
    [categories, categoryBudgets],
  );
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
    const value = catInputs[categoryId];
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await upsert.mutateAsync({
      scope: 'category',
      categoryId,
      period: 'monthly',
      amountPaise: rupeesToPaise(amount),
      rollover: false,
      startsOn: monthStart,
    });
    setCatInputs((previous) => ({ ...previous, [categoryId]: '' }));
  }

  return (
    <Screen padded={false}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <GradientPanel style={styles.headerCard}>
          <ThemedText variant="labelCaps" tone="inverse">BUDGETS</ThemedText>
          <ThemedText variant="headlineMd" style={{ color: palette.onPrimary }}>
            Plan the month with softer guardrails.
          </ThemedText>
          <ThemedText variant="bodySm" tone="inverse">
            Set what you want to spend this cycle. We'll show progress, not nag.
          </ThemedText>
        </GradientPanel>

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
                placeholder="Amount in INR"
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
          {categoryBudgets.map((budget) => {
            const category = budget.categoryId ? catById.get(budget.categoryId) : undefined;
            const spentForCategory = budget.categoryId ? spentByCat.get(budget.categoryId) ?? 0 : 0;

            return (
              <View key={budget.id} style={styles.catBudgetRow}>
                <CategoryIcon
                  icon={category?.icon ?? 'category'}
                  color={category?.color ?? palette.outline}
                  size={36}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
                    {category?.name ?? 'Category'}
                  </ThemedText>
                  <BudgetTrack spent={spentForCategory} limit={budget.amountPaise} />
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert(`Remove budget for ${category?.name ?? 'this category'}?`, undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(budget.id) },
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
          {availableCategories.length === 0 ? (
            <ThemedText variant="bodySm" tone="muted">
              All visible expense categories in this cycle already have budgets.
            </ThemedText>
          ) : (
            availableCategories.map((category) => (
              <View key={category.id} style={styles.addCatRow}>
                <CategoryIcon icon={category.icon} color={category.color} size={32} />
                <ThemedText variant="bodyBase" style={{ flex: 1 }}>{category.name}</ThemedText>
                <View style={{ minWidth: 80 }}>
                  <TextField
                    placeholder="INR"
                    keyboardType="decimal-pad"
                    value={catInputs[category.id] ?? ''}
                    onChangeText={(text) => setCatInputs((previous) => ({ ...previous, [category.id]: text }))}
                    accessibilityLabel={`${category.name} budget amount`}
                  />
                </View>
                <Button label="Set" variant="secondary" onTouchStart={() => saveCategory(category.id)} loading={upsert.isPending} />
              </View>
            ))
          )}
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
  headerCard: { marginTop: spacing.lg },
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
