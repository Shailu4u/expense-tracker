import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Image, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Screen,
  ThemedText,
  Card,
  MoneyText,
  Button,
  CategoryIcon,
  GradientPanel,
} from '@/components';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { budgetCycleRange } from '@/utils/date';
import { formatINR } from '@/utils/money';
import {
  useMonthSum,
  useCategorySums,
  useTransactionsInRange,
} from '@/features/transactions/hooks';
import { useCategories } from '@/features/categories/hooks';
import { TransactionItem } from '@/features/transactions/components/TransactionItem';
import { useBudgetsForMonth } from '@/features/budgets/hooks';
import { useSettings } from '@/features/security/hooks';

const FILTER_OPTIONS = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 1 Month', value: 'last_month' },
  { label: 'Last 1 Week', value: 'last_week' },
] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number]['value'];

export function HomeScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { data: settings } = useSettings();
  const monthStartDay = settings?.monthStartDay ?? 1;

  const [filter, setFilter] = useState<FilterOption>('month');

  const range = useMemo(() => {
    const now = new Date();
    if (filter === 'last_week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    if (filter === 'last_month') {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    return budgetCycleRange(now, monthStartDay);
  }, [filter, monthStartDay]);

  const [filterVisible, setFilterVisible] = useState(false);
  const selectedFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label;

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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: 48, height: 48, resizeMode: 'contain' }}
            />
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText
                  variant="labelCaps"
                  style={{ fontSize: 18, letterSpacing: 1, fontWeight: 'bold' }}
                >
                  Rupee
                </ThemedText>
                <ThemedText
                  variant="labelCaps"
                  tone="primary"
                  style={{ fontSize: 18, letterSpacing: 1, fontWeight: 'bold' }}
                >
                  Safe
                </ThemedText>
              </View>
              <ThemedText variant="bodySm" tone="muted" style={{ fontSize: 14 }}>
                Track.Save.Grow.
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => setFilterVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <ThemedText variant="bodySm" tone="muted">
              {selectedFilterLabel}
            </ThemedText>
            <MaterialIcons name="expand-more" size={16} color={palette.outline} />
          </Pressable>
        </View>

        <Modal visible={filterVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setFilterVisible(false)}>
            <View style={[styles.dropdownMenu, { backgroundColor: palette.surface }]}>
              {FILTER_OPTIONS.map((o) => (
                <Pressable
                  key={o.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setFilter(o.value);
                    setFilterVisible(false);
                  }}
                >
                  <ThemedText
                    variant="bodyBase"
                    style={{ color: o.value === filter ? palette.primary : palette.onBackground }}
                  >
                    {o.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        <GradientPanel style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <ThemedText variant="labelCaps" tone="inverse">
            {filter === 'month'
              ? 'SPENT THIS MONTH'
              : filter === 'last_month'
                ? 'SPENT LAST 1 MONTH'
                : 'SPENT LAST 1 WEEK'}
          </ThemedText>
          <MoneyText paise={spent} size="display" style={{ color: palette.inverseOnSurface }} />
          <ThemedText variant="bodySm" tone="inverse">
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
                        used >= 1
                          ? palette.error
                          : used >= 0.8
                            ? palette.heroGlowPeach
                            : palette.heroGlowMint,
                    },
                  ]}
                />
              </View>
              <View style={styles.budgetRow}>
                <ThemedText variant="bodySm" tone="inverse" style={{ flexShrink: 1 }}>
                  Budget {formatINR(overallBudget.amountPaise)}
                </ThemedText>
                <ThemedText
                  variant="bodySm"
                  style={{
                    color: used >= 1 ? palette.errorContainer : palette.inverseOnSurface,
                    flexShrink: 1,
                    textAlign: 'right',
                  }}
                >
                  {used >= 1
                    ? `Over by ${formatINR(spent - overallBudget.amountPaise)}`
                    : `${formatINR(remaining ?? 0)} left`}
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.heroActions}>
            <Button
              label="Add expense"
              onPress={() => router.push('/(tabs)/add')}
              fullWidth
              variant="secondary"
            />
          </View>
        </GradientPanel>

        <View style={styles.sectionHead}>
          <ThemedText variant="labelCaps" tone="muted">
            TOP CATEGORIES
          </ThemedText>
          {catSums.length > 0 && (
            <Pressable onPress={() => router.push('/reports')}>
              <ThemedText variant="labelCaps" tone="primary">
                SEE ALL
              </ThemedText>
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
                <Pressable
                  key={row.categoryId}
                  onPress={() => router.push({ pathname: '/(tabs)/transactions', params: { categoryId: row.categoryId } })}
                  android_ripple={{ color: palette.outlineVariant }}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}
                >
                  {i > 0 && <View style={[styles.sep, { backgroundColor: palette.outlineVariant }]} />}
                  <View style={styles.catRow}>
                    <CategoryIcon
                      icon={c?.icon ?? 'category'}
                      color={c?.color ?? palette.outline}
                      size={36}
                    />
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
                </Pressable>
              );
            })}
          </Card>
        )}

        <View style={styles.sectionHead}>
          <ThemedText variant="labelCaps" tone="muted">
            RECENT
          </ThemedText>
          <Pressable onPress={() => router.push('/(tabs)/transactions')}>
            <ThemedText variant="labelCaps" tone="primary">
              SEE ALL
            </ThemedText>
          </Pressable>
        </View>
        {recents.length === 0 ? (
          <Card>
            <ThemedText variant="bodyBase" tone="muted">
              No transactions yet — tap “Add expense” above.
            </ThemedText>
          </Card>
        ) : (
          <Card padded={false}>
            {recents.slice(0, 5).map((t, i) => (
              <View key={t.id}>
                {i > 0 && <View style={[styles.sep, { backgroundColor: palette.outlineVariant }]} />}
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
  scroll: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    paddingTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCard: { gap: spacing.sm, paddingHorizontal: spacing.md },
  budgetBlock: { gap: spacing.xs, marginTop: spacing.sm },
  budgetTrackBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  budgetTrackFill: { height: 8, borderRadius: radius.full },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 4 },
  heroActions: { paddingTop: spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  sep: {
    height: 1,
    marginLeft: spacing.md + 36 + spacing.md,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 56,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: spacing.containerMargin,
  },
  dropdownMenu: {
    borderRadius: radius.md,
    padding: spacing.xs,
    minWidth: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
