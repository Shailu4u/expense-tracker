import { View, type ViewProps, StyleSheet } from 'react-native';
import { elevation, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';

interface Props extends ViewProps {
  padded?: boolean;
}

export function Card({ padded = true, style, children, ...rest }: Props) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surfaceElevated, borderColor: palette.tabBorder },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    ...elevation.card,
  },
  padded: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
