import { View, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useTheme } from '@/features/theme/themeStore';

export interface DonutSlice {
  value: number;
  color: string;
  label?: string;
  count?: number;
}

interface Props {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  selectedIndex?: number | null;
  onSelectSlice?: (index: number | null) => void;
  children?: React.ReactNode;
}

export function DonutChart({
  slices,
  size = 180,
  thickness = 22,
  selectedIndex = null,
  onSelectSlice,
  children,
}: Props) {
  const { palette } = useTheme();
  const total = slices.reduce(
    (s, x) => s + (Number.isFinite(x.value) ? Math.max(x.value, 0) : 0),
    0,
  );
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={palette.surfaceContainer}
            strokeWidth={thickness}
            fill="none"
          />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          {children}
        </View>
      </View>
    );
  }

  let acc = 0;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((s, i) => {
            const v = Math.max(s.value, 0);
            if (v <= 0) return null;
            const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
            acc += v;
            const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
            if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
            const large = end - start > Math.PI ? 1 : 0;
            const x1 = cx + r * Math.cos(start);
            const y1 = cy + r * Math.sin(start);
            const x2 = cx + r * Math.cos(end);
            const y2 = cy + r * Math.sin(end);
            const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
            const isSelected = selectedIndex === i;
            const isDimmed = selectedIndex != null && !isSelected;
            const strokeWidth = isSelected ? thickness + 6 : thickness;
            return (
              <Path
                key={i}
                d={d}
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                fill="none"
                opacity={isDimmed ? 0.35 : 1}
                onPress={() => {
                  if (!onSelectSlice) return;
                  onSelectSlice(isSelected ? null : i);
                }}
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
