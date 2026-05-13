import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { ThemedText } from './ThemedText';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  rightSlot?: React.ReactNode;
}

export function TextField({ label, error, rightSlot, ...rest }: Props) {
  const { palette } = useTheme();
  return (
    <View style={styles.wrap}>
      {label && (
        <ThemedText variant="labelCaps" tone="muted" style={styles.label}>
          {label.toUpperCase()}
        </ThemedText>
      )}
      <View style={[
        styles.field,
        { borderColor: error ? palette.error : palette.outlineVariant, backgroundColor: palette.surfaceContainerLowest },
      ]}>
        <TextInput
          style={[styles.input, { color: palette.onSurface }]}
          placeholderTextColor={palette.outline}
          {...rest}
        />
        {rightSlot}
      </View>
      {error && <ThemedText variant="bodySm" tone="error">{error}</ThemedText>}
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
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: { flex: 1, ...typography.bodyBase, paddingVertical: spacing.sm },
});
