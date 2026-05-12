import { View, StyleSheet, type ViewProps } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { palette, radius, spacing } from '@/theme/tokens';

interface Props extends ViewProps {
  padded?: boolean;
}

export function GradientPanel({ padded = true, style, children, ...rest }: Props) {
  return (
    <View style={[styles.panel, padded && styles.padded, style]} {...rest}>
      <View style={{ width: 380, height: 300, position: 'absolute', top: 0, left: 0 }}>
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFillObject}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="panelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={palette.heroGradientStart} />
              <Stop offset="55%" stopColor={palette.heroGradientMid} />
              <Stop offset="100%" stopColor={palette.heroGradientEnd} />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#panelGradient)" />
          <Circle cx="84" cy="18" r="24" fill={palette.heroGlowMint} opacity={0.2} />
          <Circle cx="12" cy="90" r="22" fill={palette.heroGlowPeach} opacity={0.16} />
        </Svg>
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'relative',
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: palette.primary,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  content: {
    gap: spacing.sm,
    alignSelf: 'flex-start',
    width: '100%',
  },
});
