import { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Card, MoneyText, Button, CategoryIcon } from '@/components';
import { palette, radius, spacing } from '@/theme/tokens';
import { monthRange } from '@/utils/date';
import { formatINR } from '@/utils/money';
import {
  useMonthSum,
  useCategorySums,
  useTransactionsInRange,
} from '@/features/transactions/hooks';
import { useCategories } from '@/features/categories/hooks';
import { TransactionItem } from '@/features/transactions/components/TransactionItem';
import { useBudgetsForMonth } from '@/features/budgets/hooks';

export function HomeScreen() {
  const router = useRouter();
  const range = useMemo(() => monthRange(new Date()), []);
  const monthLabel = useMemo(
    () => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    [],
  );

  const { data: spent = 0 } = useMonthSum(range.start, range.end, 'expense');
  const { data: earned = 0 } = useMonthSum(range.start, range.end, 'income');
  const { data: catSums = [] } = useCategorySums(range.start, range.end);
  const { data: recents = [] } = useTransactionsInRange({
    start: range.start,
    end: range.end,
    kind: undefined,
  });
  const { data: categories = [] } = useCategories({ includeHidden: true });
  const { data: budgets = [] } = useBudgetsForMonth(range.start);

  const overallBudget = budgets.find((b) => b.scope === 'overall');
  const remaining = overallBudget ? Math.max(overallBudget.amountPaise - spent, 0) : null;
  const used = overallBudget ? Math.min(spent / Math.max(overallBudget.amountPaise, 1), 1) : 0;

  const catById = useMemo(() => {
    const m = new Map<string, (typeof categories)[number]>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const top = catSums.slice(0, 4);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ThemedText variant="labelCaps" tone="primary">RUPEESAFE</ThemedText>
          <ThemedText variant="bodySm" tone="muted">
            {monthLabel}
          </ThemedText>
        </View>

        <Card style={styles.heroCard}>
          <ThemedText variant="labelCaps" tone="muted">SPENT THIS MONTH</ThemedText>
          <MoneyText paise={spent} size="display" />
          <ThemedText variant="bodySm" tone="muted">
            Earned {formatINR(earned)} · Net {formatINR(earned - spent)}
          </ThemedText>

          {overallBudget && (
            <View style={styles.budgetBlock}>
              <View style={styles.budgetTrackBg}>
                <View
                  style={[
                    styles.budgetTrackFill,
                    {
                      width: `${used * 100}%`,
                      backgroundColor:
                        used >= 1 ? palette.error : used >= 0.8 ? palette.tertiary : palette.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.budgetRow}>
                <ThemedText variant="bodySm" tone="muted">
                  Budget {formatINR(overallBudget.amountPaise)}
                </ThemedText>
                <ThemedText variant="bodySm" tone={used >= 1 ? 'error' : 'muted'}>
                  {used >= 1 ? `Over by ${formatINR(spent - overallBudget.amountPaise)}` : `${formatINR(remaining ?? 0)} left`}
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.heroActions}>
            <Button
              label="Add expense"
              onPress={() => router.push('/(tabs)/add')}
              fullWidth
            />
          </View>
        </Card>

        <View style={styles.sectionHead}>
          <ThemedText variant="labelCaps" tone="muted">TOP CATEGORIES</ThemedText>
          {catSums.length > 0 && (
            <Pressable onPress={() => router.push('/reports')}>
              <ThemedText variant="labelCaps" tone="primary">SEE ALL</ThemedText>
            </Pressable>
          )}
        </View>
        {top.length === 0 ? (
          <Card>
            <ThemedText variant="bodyBase" tone="muted">
              Once you log a few transactions, your top categories will show up here.
            </ThemedText>
          </Card>
        ) : (
          <Card padded={false}>
            {top.map((row, i) => {
              const c = catById.get(row.categoryId);
              return (
                <View key={row.categoryId}>
                  {i > 0 && <View style={styles.sep} />}
                  <View style={styles.catRow}>
                    <CategoryIcon icon={c?.icon ?? 'category'} color={c?.color ?? '#6E7976'} size={36} />
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
                        {c?.name ?? 'Other'}
                      </ThemedText>
                      <ThemedText variant="bodySm" tone="muted">
                        {row.count} {row.count === 1 ? 'transaction' : 'transactions'}
                      </ThemedText>
                    </View>
                    <MoneyText paise={row.totalPaise} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        <View style={styles.sectionHead}>
          <ThemedText variant="labelCaps" tone="muted">RECENT</ThemedText>
          <Pressable onPress={() => router.push('/(tabs)/transactions')}>
            <ThemedText variant="labelCaps" tone="primary">SEE ALL</ThemedText>
          </Pressable>
        </View>
        {recents.length === 0 ? (
          <Card>
            <ThemedText variant="bodyBase" tone="muted">No transactions yet — tap “Add expense” above.</ThemedText>
          </Card>
        ) : (
          <Card padded={false}>
            {recents.slice(0, 5).map((t, i) => (
              <View key={t.id}>
                {i > 0 && <View style={styles.sep} />}
                <TransactionItem transaction={t} category={catById.get(t.categoryId)} />
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  header: { paddingTop: spacing.lg, gap: 2 },
  heroCard: { gap: spacing.sm },
  budgetBlock: { gap: spacing.xs, marginTop: spacing.sm },
  budgetTrackBg: { height: 8, backgroundColor: palette.surfaceContainerHigh, borderRadius: radius.full, overflow: 'hidden' },
  budgetTrackFill: { height: 8, borderRadius: radius.full },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroActions: { paddingTop: spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  sep: { height: 1, backgroundColor: palette.outlineVariant, marginLeft: spacing.md + 36 + spacing.md },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
});
