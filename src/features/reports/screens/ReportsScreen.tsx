import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen,
  ThemedText,
  Card,
  MoneyText,
  DonutChart,
  IncomeExpenseBars,
  GradientPanel,
  TimeRangeFilter,
  WeekdayBars,
  DailyTrend,
  PaymentModeBars,
  type BarDatum,
  type DailyPoint,
  type WeekdayDatum,
} from '@/components';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import {
  useCategorySums,
  useTotalsInRange,
  useSumByPaymentMode,
  useDailyTotals,
  useSumByWeekday,
  useMonthlyTotalsInRange,
  useTopMerchants,
} from '@/features/transactions/hooks';
import { useCategories } from '@/features/categories/hooks';
import { reportRangeFor, type ReportRangeKey } from '@/utils/date';
import { formatINR } from '@/utils/money';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function ReportsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const [rangeKey, setRangeKey] = useState<ReportRangeKey>('thisMonth');
  const range = useMemo(() => reportRangeFor(rangeKey), [rangeKey]);

  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);

  const { data: sums = [] } = useCategorySums(range.start, range.end);
  const { data: totals } = useTotalsInRange(range.start, range.end);
  const { data: categories = [] } = useCategories({ includeHidden: true });
  const { data: monthly = [] } = useMonthlyTotalsInRange(range.start, range.end);
  const { data: top = [] } = useTopMerchants(range.start, range.end, 8);
  const { data: paymentModes = [] } = useSumByPaymentMode(range.start, range.end);
  const { data: daily = [] } = useDailyTotals(range.start, range.end);
  const { data: weekdays = [] } = useSumByWeekday(range.start, range.end);

  const catById = useMemo(() => {
    const m = new Map<string, (typeof categories)[number]>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const slices = useMemo(
    () =>
      sums.map((s) => ({
        value: s.totalPaise,
        color: catById.get(s.categoryId)?.color ?? palette.outline,
        label: catById.get(s.categoryId)?.name ?? 'Other',
        count: s.count,
      })),
    [sums, catById, palette.outline],
  );

  const totalExpense = totals?.expensePaise ?? 0;
  const totalIncome = totals?.incomePaise ?? 0;
  const expenseCount = totals?.expenseCount ?? 0;
  const incomeCount = totals?.incomeCount ?? 0;
  const largestExpense = totals?.largestExpensePaise ?? 0;

  const net = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : null;
  const avgPerDay = range.days > 0 ? Math.round(totalExpense / range.days) : 0;
  const avgPerTxn = expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0;

  const selectedSliceData =
    selectedSlice != null && slices[selectedSlice] ? slices[selectedSlice] : null;
  const selectedPct =
    selectedSliceData && totalExpense > 0
      ? Math.round((selectedSliceData.value / totalExpense) * 100)
      : 0;

  const bars: BarDatum[] = useMemo(
    () =>
      monthly.map((m) => {
        const [, mm] = m.month.split('-');
        return {
          label: mm ? MONTH_LABELS[Number(mm) - 1] ?? '' : '',
          expense: m.expensePaise,
          income: m.incomePaise,
        };
      }),
    [monthly],
  );

  const dailyPoints: DailyPoint[] = useMemo(
    () =>
      daily.map((d) => ({
        day: d.day,
        expensePaise: d.expensePaise,
        incomePaise: d.incomePaise,
      })),
    [daily],
  );

  const weekdayData: WeekdayDatum[] = useMemo(
    () =>
      weekdays.map((w) => ({
        weekday: w.weekday,
        totalPaise: w.totalPaise,
        count: w.count,
      })),
    [weekdays],
  );

  return (
    <Screen padded={false}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <GradientPanel style={styles.headerCard}>
          <ThemedText variant="labelCaps" tone="inverse">
            REPORTS
          </ThemedText>
          <ThemedText variant="headlineMd" tone="inverse">
            {range.label}: your money in patterns.
          </ThemedText>
          <ThemedText variant="bodySm" tone="inverse">
            On-device analytics. Nothing leaves your phone.
          </ThemedText>
        </GradientPanel>

        <TimeRangeFilter value={rangeKey} onChange={setRangeKey} />

        <View style={styles.kpiGrid}>
          <KpiTile
            label="SPENT"
            paise={totalExpense}
            tone="negative"
            sub={`${expenseCount} ${expenseCount === 1 ? 'txn' : 'txns'}`}
          />
          <KpiTile
            label="EARNED"
            paise={totalIncome}
            tone="positive"
            sub={`${incomeCount} ${incomeCount === 1 ? 'txn' : 'txns'}`}
          />
          <KpiTile
            label="NET"
            paise={Math.abs(net)}
            tone={net >= 0 ? 'positive' : 'negative'}
            sub={
              savingsRate != null
                ? `${savingsRate >= 0 ? '' : '-'}${Math.abs(savingsRate)}% savings`
                : 'No income yet'
            }
            signed
            netKind={net >= 0 ? 'income' : 'expense'}
          />
          <KpiTile
            label="AVG / DAY"
            paise={avgPerDay}
            sub={`${range.days} ${range.days === 1 ? 'day' : 'days'}`}
          />
          <KpiTile
            label="AVG / TXN"
            paise={avgPerTxn}
            sub={`${expenseCount || 0} expenses`}
          />
          <KpiTile label="LARGEST" paise={largestExpense} sub="Single expense" />
        </View>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">
            SPEND BY CATEGORY
          </ThemedText>
          {sums.length === 0 ? (
            <ThemedText variant="bodyBase" tone="muted">
              No expenses in this range.
            </ThemedText>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <View style={styles.donutColumn}>
                <DonutChart
                  slices={slices}
                  size={180}
                  thickness={22}
                  selectedIndex={selectedSlice}
                  onSelectSlice={setSelectedSlice}
                >
                  {selectedSliceData ? (
                    <View style={{ alignItems: 'center' }}>
                      <ThemedText variant="labelCaps" tone="muted" numberOfLines={1}>
                        {(selectedSliceData.label ?? '').toUpperCase()}
                      </ThemedText>
                      <MoneyText paise={selectedSliceData.value} size="base" />
                      <ThemedText variant="bodySm" tone="muted">
                        {selectedPct}% · {selectedSliceData.count ?? 0}{' '}
                        {selectedSliceData.count === 1 ? 'txn' : 'txns'}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <ThemedText variant="labelCaps" tone="muted">
                        TOTAL
                      </ThemedText>
                      <MoneyText paise={totalExpense} size="base" />
                      <ThemedText variant="bodySm" tone="muted">
                        Tap a slice
                      </ThemedText>
                    </View>
                  )}
                </DonutChart>

                <View style={styles.legendList}>
                  {sums.map((s, i) => {
                    const c = catById.get(s.categoryId);
                    const isSelected = selectedSlice === i;
                    const color = c?.color ?? palette.outline;
                    return (
                      <Pressable
                        key={s.categoryId}
                        onPress={() => setSelectedSlice(isSelected ? null : i)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        style={({ pressed }) => [
                          styles.legendItem,
                          {
                            backgroundColor: isSelected
                              ? palette.surfaceContainerHigh
                              : 'transparent',
                            borderColor: isSelected ? color : 'transparent',
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.legendDot, { backgroundColor: color }]} />
                        <ThemedText
                          variant="bodySm"
                          numberOfLines={1}
                          style={{ flex: 1, fontWeight: isSelected ? '600' : '400' }}
                        >
                          {c?.name ?? 'Other'} ({s.count})
                        </ThemedText>
                        <MoneyText paise={s.totalPaise} size="sm" tone="muted" />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText variant="labelCaps" tone="muted">
              INCOME VS EXPENSE
            </ThemedText>
            <ThemedText variant="bodySm" tone="muted">
              {bars.length} {bars.length === 1 ? 'month' : 'months'}
            </ThemedText>
          </View>
          {bars.length === 0 ? (
            <ThemedText variant="bodyBase" tone="muted">
              Not enough history in this range.
            </ThemedText>
          ) : (
            <IncomeExpenseBars data={bars} />
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">
            DAILY TREND
          </ThemedText>
          {dailyPoints.length === 0 ? (
            <ThemedText variant="bodyBase" tone="muted">
              No daily activity yet.
            </ThemedText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <DailyTrend data={dailyPoints} />
            </ScrollView>
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">
            SPEND BY DAY OF WEEK
          </ThemedText>
          {weekdayData.length === 0 ? (
            <ThemedText variant="bodyBase" tone="muted">
              No expenses yet.
            </ThemedText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <WeekdayBars data={weekdayData} />
            </ScrollView>
          )}
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">
            HOW YOU PAID
          </ThemedText>
          <PaymentModeBars data={paymentModes} />
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="labelCaps" tone="muted">
            TOP MERCHANTS
          </ThemedText>
          {top.length === 0 ? (
            <ThemedText variant="bodyBase" tone="muted">
              Add merchant names to your transactions to see this list.
            </ThemedText>
          ) : (
            top.map((m) => (
              <Pressable
                key={m.merchant}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/transactions',
                    params: { search: m.merchant },
                  })
                }
                android_ripple={{ color: palette.outlineVariant }}
                style={({ pressed }) => [
                  styles.merchRow,
                  { borderTopColor: palette.outlineVariant },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
                    {m.merchant}
                  </ThemedText>
                  <ThemedText variant="bodySm" tone="muted">
                    {m.count} {m.count === 1 ? 'visit' : 'visits'} · avg{' '}
                    {formatINR(Math.round(m.totalPaise / m.count))}
                  </ThemedText>
                </View>
                <MoneyText paise={m.totalPaise} />
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

interface KpiTileProps {
  label: string;
  paise: number;
  tone?: 'positive' | 'negative';
  sub?: string;
  signed?: boolean;
  netKind?: 'income' | 'expense';
}

function KpiTile({ label, paise, tone, sub, signed, netKind }: KpiTileProps) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        kpiStyles.tile,
        { backgroundColor: palette.surfaceElevated, borderColor: palette.tabBorder },
      ]}
    >
      <ThemedText variant="labelCaps" tone="muted">
        {label}
      </ThemedText>
      <MoneyText
        paise={paise}
        size="base"
        tone={tone ?? 'default'}
        signed={signed}
        kind={netKind}
      />
      {sub ? (
        <ThemedText variant="bodySm" tone="muted" numberOfLines={1}>
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 100,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 2,
  },
});

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl, gap: spacing.md },
  headerCard: { marginTop: spacing.lg, marginHorizontal: spacing.containerMargin },
  card: { marginHorizontal: spacing.containerMargin },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  donutColumn: { alignItems: 'center', gap: spacing.md },
  legendList: { width: '100%', gap: 4 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
  },
  merchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
