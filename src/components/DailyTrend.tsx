import * as React from 'react';
import { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { format } from 'date-fns';
import { ThemedText } from './ThemedText';
import { MoneyText } from './MoneyText';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  expensePaise: number;
  incomePaise: number;
}

interface Props {
  data: DailyPoint[];
  height?: number;
}

export function DailyTrend({ data, height = 160 }: Props) {
  const { palette } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);

  const max = useMemo(
    () => Math.max(1, ...data.map((d) => Math.max(d.expensePaise, d.incomePaise))),
    [data],
  );
  const padding = 16;
  // Scale width to data length so dense ranges scroll horizontally without crowding.
  const minStep = 6;
  const innerW = Math.max(280, Math.max(0, data.length - 1) * minStep);
  const width = innerW + padding * 2;
  const innerH = height - padding * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const xy = (i: number, value: number) => {
    const x = padding + stepX * i;
    const y = padding + innerH - (value / max) * innerH;
    return { x, y };
  };

  const buildPath = (key: 'expensePaise' | 'incomePaise') => {
    if (data.length === 0) return '';
    const first = data[0];
    if (data.length === 1 && first) {
      const { x, y } = xy(0, first[key]);
      return `M ${x} ${y}`;
    }
    return data
      .map((d, i) => {
        const { x, y } = xy(i, d[key]);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const expensePath = buildPath('expensePaise');
  const incomePath = buildPath('incomePaise');
  const selectedDatum = selected != null ? data[selected] : null;
  const selectedLabel = selectedDatum
    ? safeFormat(selectedDatum.day, 'EEE, d MMM yyyy')
    : '';

  return (
    <View>
      <View style={[styles.tooltip, { borderColor: palette.outlineVariant }]}>
        {selectedDatum ? (
          <View style={styles.tooltipRow}>
            <View>
              <ThemedText variant="labelCaps" tone="muted">
                {selectedLabel.toUpperCase()}
              </ThemedText>
              <View style={styles.line}>
                <Dot color={palette.primaryFixedDim} />
                <ThemedText variant="bodySm">Income</ThemedText>
                <MoneyText paise={selectedDatum.incomePaise} size="sm" style={styles.amt} />
              </View>
              <View style={styles.line}>
                <Dot color={palette.primary} />
                <ThemedText variant="bodySm">Expense</ThemedText>
                <MoneyText paise={selectedDatum.expensePaise} size="sm" style={styles.amt} />
              </View>
            </View>
          </View>
        ) : (
          <ThemedText variant="bodySm" tone="muted">
            Tap a point to see that day&apos;s totals.
          </ThemedText>
        )}
      </View>

      <Svg width={width} height={height}>
        <Line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke={palette.outlineVariant}
          strokeWidth={1}
        />
        {selected != null && data[selected] ? (
          <Line
            x1={xy(selected, 0).x}
            y1={padding}
            x2={xy(selected, 0).x}
            y2={height - padding}
            stroke={palette.primary}
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="2,3"
          />
        ) : null}
        <Path d={incomePath} stroke={palette.primaryFixedDim} strokeWidth={2} fill="none" />
        <Path d={expensePath} stroke={palette.primary} strokeWidth={2} fill="none" />
        {data.map((d, i) => {
          const e = xy(i, d.expensePaise);
          const inc = xy(i, d.incomePaise);
          const isSel = selected === i;
          return (
            <React.Fragment key={d.day + i}>
              {/* Wider hit area */}
              <Rect
                x={Math.max(0, e.x - Math.max(8, stepX / 2))}
                y={padding}
                width={Math.max(16, stepX)}
                height={innerH}
                fill="transparent"
                onPress={() => setSelected(isSel ? null : i)}
              />
              <Circle
                cx={inc.x}
                cy={inc.y}
                r={isSel ? 4 : 2}
                fill={palette.primaryFixedDim}
                onPress={() => setSelected(isSel ? null : i)}
              />
              <Circle
                cx={e.x}
                cy={e.y}
                r={isSel ? 4 : 2}
                fill={palette.primary}
                onPress={() => setSelected(isSel ? null : i)}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.legend}>
        <Legend color={palette.primaryFixedDim} label="Income" />
        <Legend color={palette.primary} label="Expense" />
      </View>
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
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

function safeFormat(yyyyMmDd: string, pattern: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  try {
    return format(new Date(y, m - 1, d), pattern);
  } catch {
    return yyyyMmDd;
  }
}

const styles = StyleSheet.create({
  tooltip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  tooltipRow: { flexDirection: 'row', alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  amt: { marginLeft: 'auto' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legend: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
