import { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Card, CategoryIcon, Button, GradientPanel } from '@/components';
import { palette, spacing } from '@/theme/tokens';
import { useCategories, useHideCategory, useUnhideCategory } from '@/features/categories/hooks';

export function CategoriesScreen() {
  const router = useRouter();
  const [showHidden, setShowHidden] = useState(false);
  const { data = [], isLoading } = useCategories({ includeHidden: showHidden });
  const hide = useHideCategory();
  const unhide = useUnhideCategory();

  return (
    <Screen padded={false}>
      <GradientPanel style={styles.headerCard}>
        <ThemedText variant="labelCaps" tone="inverse">CATEGORIES</ThemedText>
        <ThemedText variant="headlineMd" style={{ color: palette.onPrimary }}>
          Shape the spending system to match real life.
        </ThemedText>
        <ThemedText variant="bodySm" tone="inverse">
          Tap to edit. Hide system categories you don't use; create your own for niche spends.
        </ThemedText>
      </GradientPanel>

      <View style={styles.toolbar}>
        <Button
          label={showHidden ? 'Showing hidden' : 'Show hidden'}
          variant="ghost"
          onPress={() => setShowHidden((v) => !v)}
        />
        <Button label="Add" onPress={() => router.push('/categories/new')} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card style={{ marginHorizontal: spacing.containerMargin }}>
            <ThemedText variant="bodyBase" tone="muted">
              {isLoading ? 'Loading…' : 'No categories.'}
            </ThemedText>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/categories/[id]', params: { id: item.id } })}
            android_ripple={{ color: palette.outlineVariant }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: palette.surfaceContainerLow }]}
          >
            <CategoryIcon icon={item.icon} color={item.color} size={40} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
                {item.name}
              </ThemedText>
              <ThemedText variant="bodySm" tone="muted">
                {item.kind === 'both' ? 'Expense & income' : item.kind === 'expense' ? 'Expense' : 'Income'}
                {item.isSystem ? ' · system' : ''}
                {item.hiddenAt ? ' · hidden' : ''}
              </ThemedText>
            </View>
            <Button
              label={item.hiddenAt ? 'Unhide' : 'Hide'}
              variant="secondary"
              onPress={() => {
                if (item.hiddenAt) {
                  void unhide.mutate(item.id);
                } else {
                  Alert.alert(
                    `Hide “${item.name}”?`,
                    'It will no longer appear in pickers but existing transactions remain attached.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Hide', onPress: () => hide.mutate(item.id) },
                    ],
                  );
                }
              }}
            />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: { marginHorizontal: spacing.containerMargin, marginTop: spacing.lg },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.sm,
  },
  list: { paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    minHeight: 64,
  },
});
