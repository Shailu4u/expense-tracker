import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';
import { ThemedText } from './ThemedText';
import { MoneyText } from './MoneyText';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';

export interface WeekdayDatum {
  weekday: number; // 0=Sun..6=Sat
  totalPaise: number;
  count: number;
}

interface Props {
  data: WeekdayDatum[];
  height?: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeekdayBars({ data, height = 140 }: Props) {
  const { palette } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);

  const map = new Map<number, WeekdayDatum>();
  for (const d of data) map.set(d.weekday, d);
  const filled: WeekdayDatum[] = Array.from({ length: 7 }, (_, i) =>
    map.get(i) ?? { weekday: i, totalPaise: 0, count: 0 },
  );

  const max = Math.max(1, ...filled.map((d) => d.totalPaise));
  const totalAll = filled.reduce((s, d) => s + d.totalPaise, 0);
  const padding = 12;
  const slotW = 38;
  const barW = 22;
  const width = padding * 2 + filled.length * slotW;

  const selectedDatum = selected != null ? filled[selected] : null;
  const selectedPct =
    selectedDatum && totalAll > 0 ? Math.round((selectedDatum.totalPaise / totalAll) * 100) : 0;

  return (
    <View>
      <View style={[styles.tooltip, { borderColor: palette.outlineVariant }]}>
        {selectedDatum ? (
          <View style={styles.tooltipRow}>
            <View>
              <ThemedText variant="labelCaps" tone="muted">
                {(DAY_LABELS[selectedDatum.weekday] ?? '').toUpperCase()}
              </ThemedText>
              <ThemedText variant="bodySm" tone="muted">
                {selectedDatum.count}{' '}
                {selectedDatum.count === 1 ? 'transaction' : 'transactions'} · {selectedPct}% of
                week
              </ThemedText>
            </View>
            <MoneyText paise={selectedDatum.totalPaise} size="base" />
          </View>
        ) : (
          <ThemedText variant="bodySm" tone="muted">
            Tap a day to see totals.
          </ThemedText>
        )}
      </View>

      <Svg width={width} height={height}>
        {filled.map((d, i) => {
          const h = (d.totalPaise / max) * (height - padding * 2);
          const x = padding + i * slotW + (slotW - barW) / 2;
          const isSelected = selected === i;
          const isDimmed = selected != null && !isSelected;
          const onPress = () => setSelected(isSelected ? null : i);
          return (
            <G key={i}>
              <Rect
                x={padding + i * slotW}
                y={padding}
                width={slotW}
                height={height - padding * 2}
                fill="transparent"
                onPress={onPress}
              />
              <Rect
                x={x}
                y={height - padding - h}
                width={barW}
                height={Math.max(0, h)}
                rx={4}
                fill={isSelected ? palette.primary : palette.primaryFixedDim}
                opacity={isDimmed ? 0.4 : 1}
                onPress={onPress}
              />
            </G>
          );
        })}
      </Svg>

      <View style={[styles.labels, { width }]}>
        {DAY_LABELS.map((d, i) => (
          <ThemedText
            key={d}
            variant="labelCaps"
            tone={selected === i ? 'primary' : 'muted'}
            style={[styles.label, { width: slotW }]}
          >
            {d}
          </ThemedText>
        ))}
      </View>
    </View>
  );
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
  tooltipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labels: { flexDirection: 'row', paddingHorizontal: 12 },
  label: { textAlign: 'center' },
});
