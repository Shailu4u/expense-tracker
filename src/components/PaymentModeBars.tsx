import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { MoneyText } from './MoneyText';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { PAYMENT_MODE_LABELS, type PaymentMode } from '@/types';

export interface PaymentModeDatum {
  paymentMode: PaymentMode;
  totalPaise: number;
  count: number;
}

interface Props {
  data: PaymentModeDatum[];
}

const MODE_COLORS: Record<PaymentMode, keyof ReturnType<typeof useTheme>['palette']> = {
  upi: 'primary',
  card: 'tertiary',
  cash: 'secondary',
  bank_transfer: 'primaryFixedDim',
  wallet: 'heroGlowPeach',
  other: 'outline',
};

export function PaymentModeBars({ data }: Props) {
  const { palette } = useTheme();
  const [selected, setSelected] = useState<PaymentMode | null>(null);

  const total = data.reduce((s, d) => s + d.totalPaise, 0);
  if (total <= 0) {
    return (
      <ThemedText variant="bodyBase" tone="muted">
        No expenses to break down yet.
      </ThemedText>
    );
  }

  const selectedDatum = selected ? data.find((d) => d.paymentMode === selected) ?? null : null;
  const selectedPct = selectedDatum ? Math.round((selectedDatum.totalPaise / total) * 100) : 0;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={[styles.stackWrap, { backgroundColor: palette.surfaceContainer }]}>
        {data.map((d) => {
          const pct = (d.totalPaise / total) * 100;
          if (pct <= 0) return null;
          const isSelected = selected === d.paymentMode;
          const isDimmed = selected != null && !isSelected;
          return (
            <Pressable
              key={d.paymentMode}
              onPress={() => setSelected(isSelected ? null : d.paymentMode)}
              accessibilityRole="button"
              accessibilityLabel={`${PAYMENT_MODE_LABELS[d.paymentMode]} ${Math.round(pct)} percent`}
              style={({ pressed }) => [
                styles.stackSeg,
                {
                  flexGrow: pct,
                  flexBasis: 0,
                  backgroundColor: palette[MODE_COLORS[d.paymentMode]],
                  opacity: isDimmed ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={[styles.tooltip, { borderColor: palette.outlineVariant }]}>
        {selectedDatum ? (
          <View style={styles.tooltipRow}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelCaps" tone="muted">
                {PAYMENT_MODE_LABELS[selectedDatum.paymentMode].toUpperCase()}
              </ThemedText>
              <ThemedText variant="bodySm" tone="muted">
                {selectedDatum.count}{' '}
                {selectedDatum.count === 1 ? 'transaction' : 'transactions'} · {selectedPct}% of
                spend
              </ThemedText>
            </View>
            <MoneyText paise={selectedDatum.totalPaise} size="base" />
          </View>
        ) : (
          <ThemedText variant="bodySm" tone="muted">
            Tap a segment to see details.
          </ThemedText>
        )}
      </View>

      <View style={styles.legend}>
        {data.map((d) => {
          const pct = Math.round((d.totalPaise / total) * 100);
          const isSelected = selected === d.paymentMode;
          return (
            <Pressable
              key={d.paymentMode}
              onPress={() => setSelected(isSelected ? null : d.paymentMode)}
              style={({ pressed }) => [
                styles.legendItem,
                {
                  backgroundColor: isSelected ? palette.surfaceContainerHigh : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.legendDot, { backgroundColor: palette[MODE_COLORS[d.paymentMode]] }]} />
              <ThemedText variant="bodySm">
                {PAYMENT_MODE_LABELS[d.paymentMode]} ({pct}%)
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stackWrap: {
    flexDirection: 'row',
    height: 20,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  stackSeg: { height: '100%' },
  tooltip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  tooltipRow: { flexDirection: 'row', alignItems: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
