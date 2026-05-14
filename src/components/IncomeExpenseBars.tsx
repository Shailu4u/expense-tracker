import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, G, Line } from 'react-native-svg';
import { ThemedText } from './ThemedText';
import { MoneyText } from './MoneyText';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';

export interface BarDatum {
  label: string;
  expense: number;
  income: number;
}

interface Props {
  data: BarDatum[];
  height?: number;
}

export function IncomeExpenseBars({ data, height = 180 }: Props) {
  const { palette } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);

  const max = useMemo(
    () =>
      Math.max(
        1,
        ...data.flatMap((d) => [
          Number.isFinite(d.expense) ? d.expense : 0,
          Number.isFinite(d.income) ? d.income : 0,
        ]),
      ),
    [data],
  );

  const padding = 16;
  const barGap = 4;
  const groupGap = 18;
  const groupWidth = 36;
  const minWidth = padding * 2 + data.length * (groupWidth + groupGap) - groupGap;

  const incomeColor = palette.primaryFixedDim;
  const expenseColor = palette.primary;

  const selectedDatum = selected != null ? data[selected] : null;
  const selectedNet = selectedDatum ? selectedDatum.income - selectedDatum.expense : 0;

  return (
    <View>
      <View style={[styles.tooltipWrap, { borderColor: palette.outlineVariant }]}>
        {selectedDatum ? (
          <View style={styles.tooltipRow}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelCaps" tone="muted">
                {selectedDatum.label.toUpperCase()}
              </ThemedText>
              <View style={styles.tooltipBreakdown}>
                <Dot color={incomeColor} />
                <ThemedText variant="bodySm">Income</ThemedText>
                <MoneyText paise={selectedDatum.income} size="sm" style={styles.tooltipAmt} />
              </View>
              <View style={styles.tooltipBreakdown}>
                <Dot color={expenseColor} />
                <ThemedText variant="bodySm">Expense</ThemedText>
                <MoneyText paise={selectedDatum.expense} size="sm" style={styles.tooltipAmt} />
              </View>
            </View>
            <View style={styles.netCol}>
              <ThemedText variant="labelCaps" tone="muted">
                NET
              </ThemedText>
              <MoneyText
                paise={selectedNet}
                size="base"
                tone={selectedNet >= 0 ? 'positive' : 'negative'}
                signed
                kind={selectedNet >= 0 ? 'income' : 'expense'}
              />
            </View>
          </View>
        ) : (
          <ThemedText variant="bodySm" tone="muted">
            Tap a bar to see the breakdown.
          </ThemedText>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={minWidth} height={height}>
          <Line
            x1={padding}
            y1={height - padding}
            x2={minWidth - padding}
            y2={height - padding}
            stroke={palette.outlineVariant}
            strokeWidth={1}
          />
          {data.map((d, i) => {
            const expH = (d.expense / max) * (height - padding * 2);
            const incH = (d.income / max) * (height - padding * 2);
            const x = padding + i * (groupWidth + groupGap);
            const barW = (groupWidth - barGap) / 2;
            const isSelected = selected === i;
            const isDimmed = selected != null && !isSelected;
            const onPress = () => setSelected(isSelected ? null : i);
            return (
              <G key={d.label + i}>
                {/* Wider hit area covering both bars */}
                <Rect
                  x={x - 2}
                  y={padding}
                  width={groupWidth + 4}
                  height={height - padding * 2}
                  fill="transparent"
                  onPress={onPress}
                />
                <Rect
                  x={x}
                  y={height - padding - incH}
                  width={barW}
                  height={Math.max(0, incH)}
                  rx={2}
                  fill={incomeColor}
                  opacity={isDimmed ? 0.4 : 1}
                  onPress={onPress}
                />
                <Rect
                  x={x + (groupWidth + barGap) / 2}
                  y={height - padding - expH}
                  width={barW}
                  height={Math.max(0, expH)}
                  rx={2}
                  fill={expenseColor}
                  opacity={isDimmed ? 0.4 : 1}
                  onPress={onPress}
                />
                {isSelected ? (
                  <Rect
                    x={x - 4}
                    y={padding - 2}
                    width={groupWidth + 8}
                    height={height - padding * 2 + 4}
                    rx={radius.sm}
                    fill="none"
                    stroke={palette.primary}
                    strokeWidth={1}
                    opacity={0.4}
                  />
                ) : null}
              </G>
            );
          })}
        </Svg>
      </ScrollView>

      <View style={styles.labels}>
        {data.map((d, i) => (
          <ThemedText
            key={d.label + i}
            variant="labelCaps"
            tone={selected === i ? 'primary' : 'muted'}
            style={styles.label}
          >
            {d.label}
          </ThemedText>
        ))}
      </View>

      <View style={styles.legend}>
        <Legend color={incomeColor} label="Income" />
        <Legend color={expenseColor} label="Expense" />
      </View>
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={[styles.legendDot, { backgroundColor: color }]} />;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <Dot color={color} />
      <ThemedText variant="bodySm" tone="muted">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tooltipBreakdown: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tooltipAmt: { marginLeft: 'auto' },
  netCol: { alignItems: 'flex-end', justifyContent: 'center' },
  labels: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, gap: 18 },
  label: { width: 36, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
