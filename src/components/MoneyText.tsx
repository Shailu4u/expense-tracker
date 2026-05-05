import { Text, type TextProps, StyleSheet } from 'react-native';
import { palette, typography } from '@/theme/tokens';
import { formatINR } from '@/utils/money';

type Size = 'display' | 'lg' | 'base' | 'sm';
type Tone = 'default' | 'muted' | 'positive' | 'negative';

interface Props extends Omit<TextProps, 'children'> {
  paise: number;
  size?: Size;
  tone?: Tone;
  showZeroPaise?: boolean;
  signed?: boolean; // prefix - / + based on kind
  kind?: 'expense' | 'income';
}

export function MoneyText({
  paise,
  size = 'base',
  tone = 'default',
  showZeroPaise,
  signed = false,
  kind,
  style,
  ...rest
}: Props) {
  const formatted = formatINR(Math.abs(paise), { showZeroPaise: showZeroPaise ?? false });
  const sign = !signed || !kind ? '' : kind === 'expense' ? '−' : '+';
  return (
    <Text
      accessibilityLabel={(kind === 'expense' ? 'minus ' : kind === 'income' ? 'plus ' : '') + formatted}
      style={[styles.base, sizeStyle(size), toneStyle(tone), style]}
      {...rest}
    >
      {sign}
      {formatted}
    </Text>
  );
}

function sizeStyle(s: Size) {
  switch (s) {
    case 'display':
      return typography.currencyDisplay;
    case 'lg':
      return typography.headlineMd;
    case 'base':
      return { ...typography.bodyBase, fontWeight: '600' as const };
    case 'sm':
      return typography.bodySm;
  }
}

function toneStyle(t: Tone) {
  switch (t) {
    case 'default':
      return { color: palette.onSurface };
    case 'muted':
      return { color: palette.onSurfaceVariant };
    case 'positive':
      return { color: palette.primary };
    case 'negative':
      return { color: palette.error };
  }
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
  },
});
