import { useState } from 'react';
import { View, StyleSheet, FlatList, Image, Pressable, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Card, Button } from '@/components';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { useAllReceipts, useDeleteReceipt } from '../hooks';

export function ReceiptsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { data: receipts = [] } = useAllReceipts();
  const remove = useDeleteReceipt();
  const [zoomUri, setZoomUri] = useState<string | null>(null);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ThemedText variant="headlineMd">Receipts</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          {receipts.length === 0
            ? 'Attach photos to any transaction.'
            : `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} on this device.`}
        </ThemedText>
      </View>

      {receipts.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText variant="bodyBase" tone="muted">
            Open a transaction and tap Attach receipt.
          </ThemedText>
        </Card>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(r) => r.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: spacing.xs }}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => {
                Alert.alert('Receipt options', undefined, [
                  { text: 'Open transaction', onPress: () => router.push(`/transactions/${item.transactionId}`) },
                  { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(item.id) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
              onPress={() => setZoomUri(item.fileUri)}
              style={[styles.tile, { backgroundColor: palette.surfaceContainerLow }]}
              accessibilityLabel="Receipt photo"
            >
              <Image source={{ uri: item.fileUri }} style={styles.thumb} />
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!zoomUri} transparent onRequestClose={() => setZoomUri(null)}>
        <View style={styles.modalBackdrop}>
          {zoomUri && <Image source={{ uri: zoomUri }} style={styles.modalImage} resizeMode="contain" />}
          <View style={styles.modalToolbar}>
            <Button label="Close" variant="secondary" onPress={() => setZoomUri(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.containerMargin, paddingTop: spacing.lg, gap: spacing.xs },
  emptyCard: { marginHorizontal: spacing.containerMargin, marginTop: spacing.md },
  grid: { padding: spacing.containerMargin, gap: spacing.xs },
  tile: { flex: 1, aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '100%', height: '85%' },
  modalToolbar: { padding: spacing.lg, width: '100%', alignItems: 'center' },
});
