import { View, type ViewProps, StyleSheet } from 'react-native';
import { elevation, palette, radius, spacing } from '@/theme/tokens';

interface Props extends ViewProps {
  padded?: boolean;
}

export function Card({ padded = true, style, children, ...rest }: Props) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.tabBorder,
    ...elevation.card,
  },
  padded: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
