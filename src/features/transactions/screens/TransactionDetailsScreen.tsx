import { useState } from 'react';
import { View, StyleSheet, Alert, Image, Pressable, ScrollView, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, ThemedText, Card, Button, MoneyText, CategoryIcon } from '@/components';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { useTransaction, useDeleteTransaction, useRestoreTransaction } from '../hooks';
import { useCategory } from '@/features/categories/hooks';
import { useReceiptsForTransaction, useAttachReceipt, useDeleteReceipt } from '@/features/receipts/hooks';
import { SmsSourceCard } from '@/features/sms-import/components/SmsSourceCard';
import { fromISO } from '@/utils/date';
import { PAYMENT_MODE_LABELS } from '@/types';

export function TransactionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette } = useTheme();
  const { data: txn, isLoading } = useTransaction(id);
  const { data: cat } = useCategory(txn?.categoryId ?? undefined);
  const del = useDeleteTransaction();
  const restore = useRestoreTransaction();
  const { data: receipts = [] } = useReceiptsForTransaction(id);
  const attach = useAttachReceipt();
  const deleteReceipt = useDeleteReceipt();
  const [justDeleted, setJustDeleted] = useState(false);
  const [zoomUri, setZoomUri] = useState<string | null>(null);

  if (isLoading) {
    return <Screen><ThemedText variant="bodyBase" tone="muted">Loading…</ThemedText></Screen>;
  }
  if (!txn) {
    return (
      <Screen>
        <ThemedText variant="bodyBase" tone="muted">Transaction not found.</ThemedText>
        <View style={{ height: spacing.md }} />
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function onDelete() {
    Alert.alert('Delete transaction?', 'You can undo this on the next screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await del.mutateAsync(txn!.id); setJustDeleted(true); } },
    ]);
  }

  async function onUndo() {
    await restore.mutateAsync(txn!.id);
    setJustDeleted(false);
  }

  async function attachReceipt(source: 'pick' | 'camera', txnId: string) {
    try {
      const result = await attach.mutateAsync({ transactionId: txnId, source });
      if (result.kind === 'permission-denied') {
        Alert.alert(
          source === 'camera' ? 'Camera permission denied' : 'Photo library permission denied',
          'Grant the permission from system settings to attach receipts.',
        );
      }
    } catch (e) {
      Alert.alert('Could not attach receipt', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <Screen padded scroll>
      <View style={styles.head}>
        <CategoryIcon icon={cat?.icon ?? 'category'} color={cat?.color ?? '#6E7976'} size={56} />
        <ThemedText variant="bodySm" tone="muted">{cat?.name ?? 'Uncategorised'}</ThemedText>
        <MoneyText paise={txn.amountPaise} size="display" kind={txn.kind} signed tone={txn.kind === 'income' ? 'positive' : 'default'} />
        <ThemedText variant="bodyBase">{txn.merchant?.trim() || cat?.name || 'Transaction'}</ThemedText>
      </View>

      <SmsSourceCard transactionId={txn.id} />

      <Card style={styles.card}>
        <Row label="Date" value={fromISO(txn.occurredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} palette={palette} />
        <Row label="Payment" value={PAYMENT_MODE_LABELS[txn.paymentMode]} palette={palette} />
        <Row label="Source" value={txn.source === 'manual' ? 'Manual entry' : txn.source === 'sms' ? 'From SMS' : 'Recurring'} palette={palette} />
        {txn.notes && <Row label="Notes" value={txn.notes} palette={palette} />}
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="labelCaps" tone="muted">RECEIPTS</ThemedText>
        {receipts.length === 0 ? (
          <ThemedText variant="bodySm" tone="muted">No receipts attached.</ThemedText>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {receipts.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setZoomUri(r.fileUri)}
                onLongPress={() => Alert.alert('Delete receipt?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteReceipt.mutate(r.id) },
                ])}
              >
                <Image source={{ uri: r.fileUri }} style={[styles.thumb, { backgroundColor: palette.surfaceContainerLow }]} />
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Pick photo" variant="secondary" onPress={() => attachReceipt('pick', txn.id)} loading={attach.isPending} />
          <Button label="Camera" variant="secondary" onPress={() => attachReceipt('camera', txn.id)} />
        </View>
      </Card>

      <Modal visible={!!zoomUri} transparent onRequestClose={() => setZoomUri(null)}>
        <View style={styles.modalBackdrop}>
          {zoomUri && <Image source={{ uri: zoomUri }} style={styles.modalImage} resizeMode="contain" />}
          <View style={{ padding: spacing.lg }}>
            <Button label="Close" variant="secondary" onPress={() => setZoomUri(null)} />
          </View>
        </View>
      </Modal>

      {justDeleted ? (
        <Card style={styles.card}>
          <ThemedText variant="bodyBase">Deleted.</ThemedText>
          <Button label="Undo" variant="secondary" onPress={onUndo} fullWidth />
        </Card>
      ) : (
        <View style={styles.actions}>
          <Button label="Edit" variant="secondary" fullWidth onPress={() => router.push({ pathname: '/(tabs)/add', params: { id: txn.id } })} />
          <Button label="Delete" variant="danger" fullWidth onPress={onDelete} />
        </View>
      )}
    </Screen>
  );
}

function Row({ label, value, palette }: { label: string; value: string; palette: ReturnType<typeof useTheme>['palette'] }) {
  return (
    <View style={[styles.row, { borderBottomColor: palette.outlineVariant }]}>
      <ThemedText variant="labelCaps" tone="muted">{label.toUpperCase()}</ThemedText>
      <ThemedText variant="bodyBase">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  card: { marginTop: spacing.md, gap: spacing.sm },
  row: { paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  thumb: { width: 96, height: 96, borderRadius: radius.md },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '100%', height: '85%' },
});
