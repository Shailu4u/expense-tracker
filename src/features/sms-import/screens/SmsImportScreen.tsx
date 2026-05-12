import { memo, useCallback, useEffect, useState } from 'react';
import { Platform, View, StyleSheet, FlatList, Alert } from 'react-native';
import { Screen, ThemedText, Card, Button, MoneyText, CategoryIcon, CategoryPicker } from '@/components';
import { palette, spacing } from '@/theme/tokens';
import * as SmsRepo from '../repository';
import { usePendingSms, useImportSms, useUpdateSmsCategory, useRejectSms } from '../hooks';
import { useCategories } from '@/features/categories/hooks';
import { fromISO } from '@/utils/date';

export function SmsImportScreen() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const importMut = useImportSms();
  const { data: pending = [] } = usePendingSms();
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    SmsRepo.isPlatformSupported().then(setSupported);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      SmsRepo.checkPermission().then(setPermission);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: (typeof pending)[number] }) => (
      <ReviewCard item={item} categories={categories} />
    ),
    [categories],
  );

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
              No SMS transactions to review. New ones will appear here automatically.
            </ThemedText>
          </Card>
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={renderItem}
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
}

const ReviewCard = memo(function ReviewCard({ item, categories }: Props) {
  const updateCategory = useUpdateSmsCategory();
  const reject = useRejectSms();
  const cats = (categories ?? []).filter((c) =>
    item.parsed.kind === 'income' ? c.kind !== 'expense' : c.kind !== 'income',
  );
  // Resolved selection from the underlying transaction. Falls back to
  // "Other" when no transaction is linked or the linked category was hidden.
  const resolvedCategoryId =
    item.txnCategoryId && cats.some((c) => c.id === item.txnCategoryId)
      ? item.txnCategoryId
      : cats.find((c) => c.name === (item.parsed.kind === 'income' ? 'Other Income' : 'Other'))?.id ??
        cats[0]?.id ??
        null;
  const [categoryId, setCategoryId] = useState<string | null>(resolvedCategoryId);

  // Keep the picker in sync when another card's update propagates this
  // transaction's category (same merchant + kind).
  useEffect(() => {
    setCategoryId(resolvedCategoryId);
  }, [resolvedCategoryId]);

  const handleChangeCategory = useCallback(
    (id: string | null) => {
      setCategoryId(id);
      if (id && id !== resolvedCategoryId) {
        updateCategory.mutate({ id: item.id, categoryId: id });
      }
    },
    [updateCategory, item.id, resolvedCategoryId],
  );

  const handleReject = useCallback(() => {
    reject.mutate(item.id);
  }, [reject, item.id]);

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
      <CategoryPicker categories={cats} value={categoryId} onChange={handleChangeCategory} />
      <View style={styles.reviewActions}>
        <Button label="Reject" variant="ghost" onPress={handleReject} />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.containerMargin, paddingTop: spacing.lg, gap: spacing.xs },
  review: { marginHorizontal: spacing.containerMargin, marginTop: spacing.sm, gap: spacing.sm },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
