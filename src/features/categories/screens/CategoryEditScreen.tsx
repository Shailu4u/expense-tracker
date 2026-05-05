import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, ThemedText, Card, Button, TextField, CategoryIcon } from '@/components';
import { palette, radius, spacing } from '@/theme/tokens';
import {
  useCategories,
  useCategory,
  useCreateCategory,
  useMergeCategory,
  useUpdateCategory,
} from '../hooks';
import type { CategoryKind } from '@/types';

const PRESET_COLORS = [
  '#7E57C2', '#43A047', '#E64A19', '#1E88E5', '#5D4037',
  '#00897B', '#8E24AA', '#D81B60', '#F4511E', '#3949AB',
  '#C2185B', '#546E7A', '#2E7D32', '#1565C0', '#00695C',
];

const PRESET_ICONS = [
  'category', 'shopping_basket', 'restaurant', 'flight', 'apartment',
  'savings', 'receipt_long', 'medication', 'local_gas_station', 'shopping_bag',
  'sim_card', 'work', 'paid', 'undo', 'cleaning_services', 'account_balance',
];

export function CategoryEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = id && id !== 'new' ? id : null;
  const { data: existing } = useCategory(editing ?? undefined);
  const { data: allCategories = [] } = useCategories({ includeHidden: false });
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const merge = useMergeCategory();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(PRESET_ICONS[0]!);
  const [color, setColor] = useState<string>(PRESET_COLORS[0]!);
  const [kind, setKind] = useState<CategoryKind>('expense');

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setIcon(existing.icon);
    setColor(existing.color);
    setKind(existing.kind);
  }, [existing]);

  const valid = name.trim().length > 0;
  const isSystem = existing?.isSystem ?? false;

  async function save() {
    if (!valid) return;
    try {
      if (editing) {
        await update.mutateAsync({ id: editing, patch: { name: name.trim(), icon, color, kind } });
      } else {
        await create.mutateAsync({ name: name.trim(), icon, color, kind, sortOrder: 999 });
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  function startMerge() {
    if (!editing) return;
    const targets = allCategories.filter((c) => c.id !== editing && c.kind !== 'income' === (kind !== 'income'));
    if (targets.length === 0) {
      Alert.alert('No targets', 'Create another category of the same kind first.');
      return;
    }
    Alert.alert(
      'Merge into…',
      'All transactions will move to the selected category. This cannot be undone.',
      targets.slice(0, 6).map((c) => ({
        text: c.name,
        onPress: async () => {
          await merge.mutateAsync({ fromId: editing, intoId: c.id });
          router.back();
        },
      })).concat([{ text: 'Cancel', onPress: async () => {} }]),
    );
  }

  return (
    <Screen padded scroll>
      <View style={styles.head}>
        <ThemedText variant="labelCaps" tone="muted">{editing ? 'EDIT CATEGORY' : 'NEW CATEGORY'}</ThemedText>
        <ThemedText variant="headlineMd">{name || 'Untitled'}</ThemedText>
        <CategoryIcon icon={icon} color={color} size={56} style={{ marginTop: spacing.sm }} />
      </View>

      <Card style={styles.card}>
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />

        <ThemedText variant="labelCaps" tone="muted">KIND</ThemedText>
        <View style={styles.row}>
          {(['expense', 'income', 'both'] as CategoryKind[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === k }}
              style={[styles.chip, kind === k && styles.chipActive]}
            >
              <ThemedText
                variant="bodySm"
                style={{ color: kind === k ? palette.onPrimary : palette.onSurface, fontWeight: '600' }}
              >
                {k === 'both' ? 'Both' : k === 'expense' ? 'Expense' : 'Income'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText variant="labelCaps" tone="muted">COLOR</ThemedText>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {PRESET_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              accessibilityRole="button"
              accessibilityLabel={`Color ${c}`}
              accessibilityState={{ selected: color === c }}
              style={[
                styles.swatch,
                { backgroundColor: c },
                color === c && { borderWidth: 3, borderColor: palette.primary },
              ]}
            />
          ))}
        </View>

        <ThemedText variant="labelCaps" tone="muted">ICON</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {PRESET_ICONS.map((i) => (
            <Pressable
              key={i}
              onPress={() => setIcon(i)}
              accessibilityRole="button"
              accessibilityLabel={`Icon ${i}`}
              accessibilityState={{ selected: icon === i }}
              style={[styles.iconCell, icon === i && { borderColor: palette.primary, borderWidth: 2 }]}
            >
              <CategoryIcon icon={i} color={color} size={36} />
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      <View style={styles.cta}>
        <Button label={editing ? 'Save changes' : 'Create category'} disabled={!valid} onPress={save} fullWidth />
        {editing && !isSystem && (
          <Button label="Merge into another category" variant="secondary" onPress={startMerge} fullWidth />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.xl, gap: spacing.xs, alignItems: 'center' },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceContainerLowest,
  },
  chipActive: { backgroundColor: palette.primaryContainer, borderColor: palette.primaryContainer },
  swatch: { width: 36, height: 36, borderRadius: 18, marginRight: spacing.xs, marginBottom: spacing.xs },
  iconCell: {
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cta: { marginTop: spacing.lg, gap: spacing.sm },
});
