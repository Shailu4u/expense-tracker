import { View, StyleSheet } from 'react-native';
import Svg, { Rect, G, Line } from 'react-native-svg';
import { ThemedText } from './ThemedText';
import { palette, spacing } from '@/theme/tokens';
import { formatINR } from '@/utils/money';

export interface Bar {
  label: string;
  expense: number; // paise
  income: number; // paise
}

interface Props {
  data: Bar[];
  height?: number;
}

export function MonthlyBars({ data, height = 160 }: Props) {
  const max = Math.max(1, ...data.flatMap((d) => [
    Number.isFinite(d.expense) ? d.expense : 0,
    Number.isFinite(d.income) ? d.income : 0
  ]));
  const padding = 16;
  const barGap = 4;
  const groupGap = 12;
  const groupWidth = 32;
  const width = padding * 2 + data.length * (groupWidth + groupGap) - groupGap;

  return (
    <View>
      <Svg width={width} height={height}>
        <Line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke={palette.outlineVariant}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const expH = (d.expense / max) * (height - padding * 2);
          const incH = (d.income / max) * (height - padding * 2);
          const x = padding + i * (groupWidth + groupGap);
          return (
            <G key={d.label}>
              <Rect
                x={x}
                y={height - padding - incH}
                width={(groupWidth - barGap) / 2}
                height={incH}
                rx={2}
                fill={palette.primaryFixedDim}
              />
              <Rect
                x={x + (groupWidth + barGap) / 2}
                y={height - padding - expH}
                width={(groupWidth - barGap) / 2}
                height={expH}
                rx={2}
                fill={palette.primary}
              />
            </G>
          );
        })}
      </Svg>
      <View style={styles.labels}>
        {data.map((d) => (
          <ThemedText key={d.label} variant="labelCaps" tone="muted" style={styles.label}>
            {d.label}
          </ThemedText>
        ))}
      </View>
      <View style={styles.legend}>
        <Legend color={palette.primaryFixedDim} label="Income" />
        <Legend color={palette.primary} label="Expense" />
        <ThemedText variant="bodySm" tone="muted" style={{ marginLeft: 'auto' }}>
          Max {formatINR(max)}
        </ThemedText>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText variant="bodySm" tone="muted">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, gap: 12 },
  label: { width: 32, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
