import { Pressable, StyleSheet, Text, ActivityIndicator, type PressableProps, type ViewStyle, type StyleProp, type TextStyle } from 'react-native';
import { palette, radius, spacing, typography } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  leadingIcon,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      android_ripple={{ color: palette.outlineVariant }}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        styleFor(variant),
        pressed && !isDisabled && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColorFor(variant)} />
      ) : (
        <>
          {leadingIcon}
          <Text style={[styles.label, { color: textColorFor(variant) }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function styleFor(v: Variant): ViewStyle {
  switch (v) {
    case 'primary':
      return { backgroundColor: palette.primaryContainer };
    case 'secondary':
      return {
        backgroundColor: palette.surfaceOverlay,
        borderWidth: 1,
        borderColor: palette.tabBorder,
      };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'danger':
      return { backgroundColor: palette.errorContainer };
  }
}

function textColorFor(v: Variant): string {
  switch (v) {
    case 'primary':
      return palette.onPrimary;
    case 'secondary':
      return palette.primary;
    case 'ghost':
      return palette.primary;
    case 'danger':
      return palette.onErrorContainer;
  }
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.base,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    ...typography.bodyBase,
    fontWeight: '600',
  } satisfies TextStyle,
});
