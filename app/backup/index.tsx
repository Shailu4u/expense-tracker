import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Screen, ThemedText, Card, Button } from '@/components';
import { spacing } from '@/theme/tokens';
import * as Backup from '@/services/backup';
import { monthRange } from '@/utils/date';

export default function BackupScreen() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<'export' | 'csv' | 'restore' | null>(null);

  async function onExport() {
    setBusy('export');
    try {
      await Backup.exportBackup();
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function onCsv() {
    setBusy('csv');
    try {
      const r = monthRange(new Date());
      await Backup.exportTransactionsCsv(r.start, r.end);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function onRestore() {
    Alert.alert(
      'Restore from backup?',
      'This replaces the current data. Make sure you have an export of the current state first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setBusy('restore');
            try {
              const r = await Backup.pickAndRestore();
              if (!r.ok) {
                if (r.reason !== 'cancelled') Alert.alert('Restore failed', r.reason ?? 'Unknown');
              } else {
                Alert.alert('Restored', `${r.rows} rows imported.`);
                await qc.invalidateQueries();
              }
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText variant="headlineMd">Backup &amp; Export</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          Local files only. Use your device's Share sheet to copy them somewhere safe.
        </ThemedText>
      </View>

      <Card>
        <ThemedText variant="labelCaps" tone="muted">BACKUP</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          Full JSON backup including categories, budgets, recurring, and SMS history.
        </ThemedText>
        <Button label="Export backup" onPress={onExport} loading={busy === 'export'} />
        <Button label="Restore from backup…" variant="secondary" onPress={onRestore} loading={busy === 'restore'} />
      </Card>

      <Card>
        <ThemedText variant="labelCaps" tone="muted">CSV EXPORT</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          Transactions for the current month as CSV.
        </ThemedText>
        <Button label="Export CSV (this month)" onPress={onCsv} loading={busy === 'csv'} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.lg, gap: spacing.xs },
});
