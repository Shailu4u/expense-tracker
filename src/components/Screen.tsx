import { View, ScrollView, StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, spacing } from '@/theme/tokens';

interface Props extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
}

export function Screen({ scroll = false, padded = true, style, children, ...rest }: Props) {
  const inner = (
    <View
      style={[padded && { paddingHorizontal: spacing.containerMargin }, style]}
      {...rest}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, padded && { paddingHorizontal: spacing.containerMargin }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={style} {...rest}>
            {children}
          </View>
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
});
