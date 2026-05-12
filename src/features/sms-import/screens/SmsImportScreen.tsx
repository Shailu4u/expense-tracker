import { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, FlatList, Alert } from 'react-native';
import { Screen, ThemedText, Card, Button, MoneyText, CategoryIcon, CategoryPicker } from '@/components';
import { palette, spacing } from '@/theme/tokens';
import * as SmsRepo from '../repository';
import { usePendingSms, useImportSms, useAcceptSms, useRejectSms } from '../hooks';
import { useCategories } from '@/features/categories/hooks';
import { fromISO } from '@/utils/date';

export function SmsImportScreen() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const importMut = useImportSms();
  const { data: pending = [] } = usePendingSms();
  const accept = useAcceptSms();
  const reject = useRejectSms();
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    SmsRepo.isPlatformSupported().then(setSupported);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      SmsRepo.checkPermission().then(setPermission);
    }
  }, []);

  if (Platform.OS !== 'android' || supported === false) {
    return (
      <Screen scroll>
        <View style={styles.header}>
          <ThemedText variant="headlineMd">SMS Import</ThemedText>
        </View>
        <Card>
          <ThemedText variant="bodyBase">Available on Android only.</ThemedText>
          <ThemedText variant="bodySm" tone="muted">
            iOS does not allow third-party apps to read SMS. Add transactions manually instead.
          </ThemedText>
        </Card>
      </Screen>
    );
  }

  async function ask() {
    const ok = await SmsRepo.requestPermission();
    setPermission(ok);
    if (!ok) {
      Alert.alert(
        'Permission denied',
        'Without SMS permission we cannot scan messages. We never upload them — read-only on this device.',
      );
    }
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ThemedText variant="headlineMd">SMS Import</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          We read transaction SMS on this device only. Nothing is uploaded.
        </ThemedText>
      </View>

      <View style={{ paddingHorizontal: spacing.containerMargin }}>
        {permission === false || permission === null ? (
          <Card>
            <ThemedText variant="bodyBase">Grant SMS read access to scan recent messages.</ThemedText>
            <Button label="Allow SMS access" onPress={ask} />
          </Card>
        ) : (
          <Card>
            <ThemedText variant="bodyBase">Scan messages from the last 30 days.</ThemedText>
            <Button
              label="Scan now"
              onPress={() => importMut.mutate(30)}
              loading={importMut.isPending}
            />
            {importMut.data && (
              <ThemedText variant="bodySm" tone="muted">
                Scanned {importMut.data.scanned}, found {importMut.data.parsed} new.
              </ThemedText>
            )}
            {importMut.isError && (
              <ThemedText variant="bodySm" tone="muted">
                {importMut.error instanceof Error ? importMut.error.message : 'Scan failed.'}
              </ThemedText>
            )}
          </Card>
        )}
      </View>

      <FlatList
        style={{ marginTop: spacing.md }}
        data={pending}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={
          <Card style={{ marginHorizontal: spacing.containerMargin }}>
            <ThemedText variant="bodyBase" tone="muted">
              No pending messages to review.
            </ThemedText>
          </Card>
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <ReviewCard
            item={item}
            categories={categories}
            onAccept={(catId) => accept.mutate({ id: item.id, categoryId: catId })}
            onReject={() => reject.mutate(item.id)}
          />
        )}
      />
    </Screen>
  );
}

interface Props {
  item: Awaited<ReturnType<typeof SmsRepo.listPending>>[number];
  categories: ReturnType<typeof useCategories>['data'] extends infer T
    ? T extends Array<infer C>
      ? C[]
      : never
    : never;
  onAccept: (categoryId: string) => void;
  onReject: () => void;
}

function ReviewCard({ item, categories, onAccept, onReject }: Props) {
  const cats = (categories ?? []).filter((c) =>
    item.parsed.kind === 'income' ? c.kind !== 'expense' : c.kind !== 'income',
  );
  const [categoryId, setCategoryId] = useState<string | null>(cats[0]?.id ?? null);

  return (
    <Card style={styles.review}>
      <View style={styles.reviewHead}>
        <CategoryIcon icon="sms" color={palette.primary} size={32} />
        <View style={{ flex: 1 }}>
          <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
            {item.parsed.merchant ?? item.parsed.bankName}
          </ThemedText>
          <ThemedText variant="bodySm" tone="muted">
            {item.sender} · {fromISO(item.receivedAt).toLocaleString('en-IN', { dateStyle: 'medium' })}
          </ThemedText>
        </View>
        <MoneyText paise={item.parsed.amountPaise} kind={item.parsed.kind} signed />
      </View>
      <ThemedText variant="bodySm" tone="muted" numberOfLines={3}>
        {item.body}
      </ThemedText>
      <ThemedText variant="labelCaps" tone="muted">CATEGORY</ThemedText>
      <CategoryPicker categories={cats} value={categoryId} onChange={setCategoryId} />
      <View style={styles.reviewActions}>
        <Button label="Reject" variant="ghost" onPress={onReject} />
        <Button label="Accept" disabled={!categoryId} onPress={() => categoryId && onAccept(categoryId)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.containerMargin, paddingTop: spacing.lg, gap: spacing.xs },
  review: { marginHorizontal: spacing.containerMargin, marginTop: spacing.sm, gap: spacing.sm },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
