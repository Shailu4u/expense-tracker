import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { CategoryIcon } from './CategoryIcon';
import type { Category } from '@/features/categories/repository';
import { palette, radius, spacing } from '@/theme/tokens';

interface Props {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
}

export function CategoryPicker({ categories, value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {categories.map((c) => {
        const active = c.id === value;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id)}
            accessibilityRole="button"
            accessibilityLabel={c.name}
            accessibilityState={{ selected: active }}
            style={styles.cell}
          >
            <View style={[styles.iconWrap, active && { borderColor: palette.primary, borderWidth: 2 }]}>
              <CategoryIcon icon={c.icon} color={c.color} size={48} />
            </View>
            <ThemedText
              variant="bodySm"
              style={{
                ...styles.label,
                ...(active ? { color: palette.primary, fontWeight: '600' } : {}),
              }}
              numberOfLines={1}
            >
              {c.name}
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
  cell: { alignItems: 'center', width: 72, gap: spacing.xs },
  iconWrap: { borderRadius: radius.full, padding: 2, borderWidth: 2, borderColor: 'transparent' },
  label: { textAlign: 'center' },
});
