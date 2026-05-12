import { Text, type TextProps, StyleSheet } from 'react-native';
import { palette, typography } from '@/theme/tokens';

type Variant = 'displayLg' | 'headlineMd' | 'bodyBase' | 'bodySm' | 'labelCaps';
type Tone = 'default' | 'muted' | 'primary' | 'error' | 'inverse';

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

export function ThemedText({ variant = 'bodyBase', tone = 'default', style, children, ...rest }: Props) {
  return (
    <Text style={[typography[variant], toneStyle(tone), styles.base, style]} {...rest}>
      {children}
    </Text>
  );
}

function toneStyle(t: Tone) {
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
  }
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
