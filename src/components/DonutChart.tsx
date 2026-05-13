import { View, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useTheme } from '@/features/theme/themeStore';

interface Slice {
  value: number;
  color: string;
  label?: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}

export function DonutChart({ slices, size = 180, thickness = 22, children }: Props) {
  const { palette } = useTheme();
  const total = slices.reduce((s, x) => s + (Number.isFinite(x.value) ? Math.max(x.value, 0) : 0), 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} stroke={palette.surfaceContainer} strokeWidth={thickness} fill="none" />
        </Svg>
        <View style={styles.center}>{children}</View>
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
            return <Path key={i} d={d} stroke={s.color} strokeWidth={thickness} strokeLinecap="butt" fill="none" />;
          })}
        </G>
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
