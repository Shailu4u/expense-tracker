import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { palette, radius, spacing, typography } from '@/theme/tokens';
import { ThemedText } from './ThemedText';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  rightSlot?: React.ReactNode;
}

export function TextField({ label, error, rightSlot, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label && (
        <ThemedText variant="labelCaps" tone="muted" style={styles.label}>
          {label.toUpperCase()}
        </ThemedText>
      )}
      <View style={[styles.field, !!error && { borderColor: palette.error }]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={palette.outline}
          {...rest}
        />
        {rightSlot}
      </View>
      {error && (
        <ThemedText variant="bodySm" tone="error">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {},
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.outlineVariant,
    borderRadius: radius.base,
    backgroundColor: palette.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: { flex: 1, ...typography.bodyBase, color: palette.onSurface, paddingVertical: spacing.sm },
});
