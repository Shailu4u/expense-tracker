import { Text, type TextProps, StyleSheet } from 'react-native';
import { typography, type Palette } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';

type Variant = 'displayLg' | 'headlineMd' | 'bodyBase' | 'bodySm' | 'labelCaps';
export type Tone = 'default' | 'muted' | 'primary' | 'error' | 'inverse' | 'positive';

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

export function ThemedText({ variant = 'bodyBase', tone = 'default', style, children, ...rest }: Props) {
  const { palette } = useTheme();
  return (
    <Text style={[typography[variant], toneStyle(tone, palette), styles.base, style]} {...rest}>
      {children}
    </Text>
  );
}

function toneStyle(t: Tone, palette: Palette) {
  switch (t) {
    case 'default':
      return { color: palette.onSurface };
    case 'muted':
      return { color: palette.onSurfaceVariant };
    case 'primary':
      return { color: palette.primary };
    case 'error':
      return { color: palette.error };
    case 'inverse':
      return { color: palette.inverseOnSurface };
    case 'positive':
      return { color: palette.onSuccessContainer };
  }
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
