import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { palette, radius, spacing, typography } from '@/theme/tokens';
import { PAYMENT_MODES, PAYMENT_MODE_LABELS, type PaymentMode } from '@/types';

interface Props {
  value: PaymentMode;
  onChange: (mode: PaymentMode) => void;
}

export function PaymentModePicker({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {PAYMENT_MODES.map((m) => {
        const active = value === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            accessibilityRole="button"
            accessibilityLabel={PAYMENT_MODE_LABELS[m]}
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <ThemedText
              variant="bodySm"
              style={{
                ...styles.chipText,
                ...(active ? { color: palette.onPrimary, fontWeight: '600' } : {}),
              }}
            >
              {PAYMENT_MODE_LABELS[m]}
            </ThemedText>
          </Pressable>
        );
      })}
      <View style={{ width: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceContainerLowest,
  },
  chipActive: {
    backgroundColor: palette.primaryContainer,
    borderColor: palette.primaryContainer,
  },
  chipText: { ...typography.bodySm },
});
