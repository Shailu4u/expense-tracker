import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Card, MoneyText, DonutChart, MonthlyBars, CategoryIcon } from '@/components';
import { palette, spacing } from '@/theme/tokens';
import { useCategorySums, useMonthSum } from '@/features/transactions/hooks';
import { useCategories } from '@/features/categories/hooks';
import * as TransactionRepo from '@/features/transactions/repository';
import { useQuery } from '@tanstack/react-query';
import { monthRange } from '@/utils/date';
import { formatINR } from '@/utils/money';

export function ReportsScreen() {
  const router = useRouter();
  const range = useMemo(() => monthRange(new Date()), []);
  const { data: sums = [] } = useCategorySums(range.start, range.end);
  const { data: categories = [] } = useCategories({ includeHidden: true });
  const { data: monthly = [] } = useQuery({
    queryKey: ['transactions', 'monthlyTotals', 6],
    queryFn: () => TransactionRepo.monthlyTotals(6),
  });
  const { data: top = [] } = useQuery({
    queryKey: ['transactions', 'topMerchants', range.start, range.end],
    queryFn: () => TransactionRepo.topMerchants(range.start, range.end, 8),
  });
  const { data: monthSpent = 0 } = useMonthSum(range.start, range.end, 'expense');

  const catById = useMemo(() => {
    const m = new Map<string, (typeof categories)[number]>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const slices = sums.map((s) => ({
    value: s.totalPaise,
    color: catById.get(s.categoryId)?.color ?? palette.outline,
    label: catById.get(s.categoryId)?.name ?? 'Other',
  }));

  const bars = monthly.map((m) => {
    const [, mm] = m.month.split('-');
    return {
      label: monthShort(Number(mm)),
      expense: m.expensePaise,
      income: m.incomePaise,
    };
  });

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ThemedText variant="headlineMd">Reports</ThemedText>
          <ThemedText variant="bodySm" tone="muted">
            On-device analytics. Nothing leaves your phone.
          </ThemedText>
        </View>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">SPEND BY CATEGORY · THIS MONTH</ThemedText>
          {sums.length === 0 ? (
            <ThemedText variant="bodyBase" tone="muted">
              No expenses yet this month.
            </ThemedText>
          ) : (
            <View style={styles.donutRow}>
              <DonutChart slices={slices} size={160} thickness={20}>
                <ThemedText variant="labelCaps" tone="muted">TOTAL</ThemedText>
                <MoneyText paise={monthSpent} size="base" />
              </DonutChart>
              <View style={{ flex: 1, gap: spacing.xs }}>
                {sums.slice(0, 5).map((s) => {
                  const c = catById.get(s.categoryId);
                  return (
                    <Pressable
                      key={s.categoryId}
                      style={styles.legendRow}
                      onPress={() => router.push('/(tabs)/transactions')}
                    >
                      <View style={[styles.legendDot, { backgroundColor: c?.color ?? palette.outline }]} />
                      <ThemedText variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
                        {c?.name ?? 'Other'}
                      </ThemedText>
                      <MoneyText paise={s.totalPaise} size="sm" tone="muted" />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">LAST 6 MONTHS</ThemedText>
          {bars.length === 0 ? (
            <ThemedText variant="bodyBase" tone="muted">Not enough history yet.</ThemedText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <MonthlyBars data={bars} />
            </ScrollView>
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">TOP MERCHANTS</ThemedText>
          {top.length === 0 ? (
            <ThemedText variant="bodyBase" tone="muted">
              Add merchant names to your transactions to see this list.
            </ThemedText>
          ) : (
            top.map((m) => (
              <View key={m.merchant} style={styles.merchRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
                    {m.merchant}
                  </ThemedText>
                  <ThemedText variant="bodySm" tone="muted">
                    {m.count} {m.count === 1 ? 'visit' : 'visits'} · avg {formatINR(Math.round(m.totalPaise / m.count))}
                  </ThemedText>
                </View>
                <MoneyText paise={m.totalPaise} />
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function monthShort(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? '';
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  header: { paddingTop: spacing.lg, gap: spacing.xs },
  card: { gap: spacing.sm },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  merchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.outlineVariant,
  },
});
