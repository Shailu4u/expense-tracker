import { View, ScrollView, StyleSheet, type ViewProps } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { AppFooterNav } from './AppFooterNav';

interface Props extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
}

export function Screen({ scroll = false, padded = true, style, children, ...rest }: Props) {
  const segments = useSegments();
  const { palette } = useTheme();
  const showFooter = segments[0] !== '(tabs)' && segments[0] !== '(onboarding)' && segments[0] !== 'lock';
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]} edges={['top']}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="screenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.backgroundAccent} />
            <Stop offset="40%" stopColor={palette.background} />
            <Stop offset="100%" stopColor={palette.surfaceOverlay} />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#screenGradient)" />
        <Circle cx="95" cy="5" r="24" fill={palette.heroGlowMint} opacity={0.14} />
        <Circle cx="10" cy="16" r="18" fill={palette.heroGlowPeach} opacity={0.14} />
      </Svg>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            padded && { paddingHorizontal: spacing.containerMargin },
            showFooter && styles.footerSpacing,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={style} {...rest}>
            {children}
          </View>
        </ScrollView>
      ) : (
        <View
          style={[
            styles.content,
            padded && { paddingHorizontal: spacing.containerMargin },
            showFooter && styles.footerSpacing,
            style,
          ]}
          {...rest}
        >
          {children}
        </View>
      )}
      {showFooter && <AppFooterNav />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  content: { flex: 1 },
  footerSpacing: { paddingBottom: 112 },
});
