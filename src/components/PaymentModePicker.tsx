import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { PAYMENT_MODES, PAYMENT_MODE_LABELS, type PaymentMode } from '@/types';

interface Props {
  value: PaymentMode;
  onChange: (mode: PaymentMode) => void;
}

export function PaymentModePicker({ value, onChange }: Props) {
  const { palette } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {PAYMENT_MODES.map((m) => {
        const active = value === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            accessibilityRole="button"
            accessibilityLabel={PAYMENT_MODE_LABELS[m]}
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              { borderColor: palette.outlineVariant, backgroundColor: palette.surfaceContainerLowest },
              active && { backgroundColor: palette.primaryContainer, borderColor: palette.primaryContainer },
            ]}
          >
            <ThemedText
              variant="bodySm"
              style={[styles.chipText, active && { color: palette.onPrimary, fontWeight: '600' }]}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { ...typography.bodySm },
});
