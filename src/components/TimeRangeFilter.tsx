import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { REPORT_RANGE_KEYS, reportRangeFor, type ReportRangeKey } from '@/utils/date';

interface Props {
  value: ReportRangeKey;
  onChange: (key: ReportRangeKey) => void;
}

export function TimeRangeFilter({ value, onChange }: Props) {
  const { palette } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {REPORT_RANGE_KEYS.map((k) => {
        const isActive = k === value;
        const label = reportRangeFor(k).label;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter ${label}`}
            android_ripple={{ color: palette.outlineVariant }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isActive ? palette.primary : palette.surfaceContainer,
                borderColor: isActive ? palette.primary : palette.outlineVariant,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <ThemedText
              variant="bodySm"
              style={{
                color: isActive ? palette.onPrimary : palette.onSurface,
                fontWeight: '600',
              }}
            >
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.containerMargin, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
