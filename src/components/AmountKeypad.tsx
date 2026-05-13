import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';

const KEYS: (string | 'BACK' | '.')[] = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '.', '0', 'BACK',
];

interface Props {
  value: string;
  onChange: (next: string) => void;
}

export function AmountKeypad({ value, onChange }: Props) {
  const { palette } = useTheme();

  function press(k: string) {
    if (k === 'BACK') { onChange(value.slice(0, -1)); return; }
    if (k === '.') {
      if (value.includes('.')) return;
      onChange(value === '' ? '0.' : `${value}.`);
      return;
    }
    if (k === '0' && value === '') { onChange('0'); return; }
    if (value === '0' && k !== '.') { onChange(k); return; }
    if (value.includes('.')) {
      const decimals = value.split('.')[1] ?? '';
      if (decimals.length >= 2) return;
    }
    onChange(value + k);
  }

  return (
    <View style={styles.grid}>
      {/* Add a title*/}
      <ThemedText variant="bodySm" tone="muted" style={{ color: palette.onSurface }}>
        AMOUNT (tap numbers to edit)
      </ThemedText>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => press(k)}
          accessibilityRole="button"
          accessibilityLabel={k === 'BACK' ? 'Backspace' : `Number ${k}`}
          android_ripple={{ color: palette.outlineVariant }}
          style={({ pressed }) => [
            styles.key,
            { backgroundColor: palette.surfaceContainerLowest, borderColor: palette.outlineVariant },
            pressed && { backgroundColor: palette.surfaceContainerHigh },
          ]}
        >
          <ThemedText variant="headlineMd" style={[styles.keyText, { color: palette.onSurface }]}>
            {k === 'BACK' ? '⌫' : k}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, columnGap: spacing.sm },
  key: {
    width: '30%',
    aspectRatio: 2.4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 56,
  },
  keyText: { ...typography.headlineMd, fontWeight: '600' },
});
