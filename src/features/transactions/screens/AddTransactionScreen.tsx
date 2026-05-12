import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  ThemedText,
  Button,
  Card,
  AmountKeypad,
  CategoryPicker,
  PaymentModePicker,
  TextField,
  MoneyText,
} from '@/components';
import { palette, radius, spacing } from '@/theme/tokens';
import { useCategoriesForKind } from '@/features/categories/hooks';
import {
  useCreateTransaction,
  useUpdateTransaction,
  useTransaction,
  useRecentMerchants,
} from '@/features/transactions/hooks';
import { rupeesToPaise } from '@/utils/money';
import { nowISO, fromISO } from '@/utils/date';
import type { PaymentMode, TransactionKind } from '@/types';

export default function AddOrEditTransaction() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: TransactionKind }>();
  const editingId = params.id ?? null;
  const { data: existing } = useTransaction(editingId ?? undefined);

  const [kind, setKind] = useState<TransactionKind>((params.kind as TransactionKind) ?? 'expense');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState<string>(nowISO());

  const { data: categories = [] } = useCategoriesForKind(kind);
  const { data: recents = [] } = useRecentMerchants();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();

  useEffect(() => {
    if (!existing) return;
    setKind(existing.kind);
    setAmount(String(existing.amountPaise / 100));
    setCategoryId(existing.categoryId);
    setPaymentMode(existing.paymentMode);
    setMerchant(existing.merchant ?? '');
    setNotes(existing.notes ?? '');
    setOccurredAt(existing.occurredAt);
  }, [existing]);

  // default-select first category when picker loads
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0]!.id);
    }
  }, [categories, categoryId]);

  const amountNumber = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);
  const amountPaise = rupeesToPaise(amountNumber || 0);
  const canSave = amountPaise > 0 && !!categoryId;

  async function save() {
    if (!canSave || !categoryId) return;
    try {
      if (editingId) {
        await update.mutateAsync({
          id: editingId,
          patch: {
            kind,
            amountPaise,
            categoryId,
            paymentMode,
            merchant: merchant.trim() || null,
            notes: notes.trim() || null,
            occurredAt,
          },
        });
      } else {
        await create.mutateAsync({
          kind,
          amountPaise,
          categoryId,
          paymentMode,
          merchant: merchant.trim() || null,
          notes: notes.trim() || null,
          occurredAt,
          source: 'manual',
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText variant="labelCaps" tone="muted">
            {editingId ? 'EDIT TRANSACTION' : 'NEW TRANSACTION'}
          </ThemedText>
          <View style={styles.kindToggle}>
            <KindButton label="Expense" active={kind === 'expense'} onPress={() => setKind('expense')} />
            <KindButton label="Income" active={kind === 'income'} onPress={() => setKind('income')} />
          </View>
          <View style={styles.amountDisplay}>
            <MoneyText paise={amountPaise} size="display" tone={kind === 'income' ? 'positive' : 'default'} />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="labelCaps" tone="muted">CATEGORY</ThemedText>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
        </View>

        <View style={styles.section}>
          <ThemedText variant="labelCaps" tone="muted">PAYMENT MODE</ThemedText>
          <PaymentModePicker value={paymentMode} onChange={setPaymentMode} />
        </View>

        <View style={styles.section}>
          <TextField
            label="Merchant"
            placeholder="e.g. Big Bazaar, Zomato"
            value={merchant}
            onChangeText={setMerchant}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {recents.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentsRow}>
              {recents.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMerchant(m)}
                  accessibilityRole="button"
                  style={styles.recentChip}
                >
                  <ThemedText variant="bodySm" tone="muted">{m}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <TextField
            label="Notes"
            placeholder="Optional"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <View style={styles.section}>
          <ThemedText variant="bodySm" tone="muted">
            Date · {fromISO(occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {'  '}
            <ThemedText variant="bodySm" tone="primary" onPress={() => setOccurredAt(nowISO())}>
              Reset to now
            </ThemedText>
          </ThemedText>
        </View>

        <Card style={styles.keypadCard}>
          <AmountKeypad value={amount} onChange={setAmount} />
        </Card>

        <View style={styles.cta}>
          <Button
            label={editingId ? 'Save changes' : `Add ${kind === 'income' ? 'income' : 'expense'}`}
            onPress={save}
            disabled={!canSave}
            loading={create.isPending || update.isPending}
            fullWidth
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function KindButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.kindBtn, active && styles.kindBtnActive]}
    >
      <ThemedText
        variant="bodyBase"
        style={{
          fontWeight: '600',
          color: active ? palette.onPrimary : palette.onSurfaceVariant,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  header: { paddingTop: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  kindToggle: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceContainer,
    borderRadius: radius.full,
    padding: 4,
  },
  kindBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    minWidth: 110,
    alignItems: 'center',
  },
  kindBtnActive: { backgroundColor: palette.primaryContainer },
  amountDisplay: { paddingVertical: spacing.md },
  section: { gap: spacing.xs },
  recentsRow: { gap: spacing.xs, paddingTop: spacing.xs },
  recentChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: palette.surfaceContainer,
  },
  keypadCard: { paddingVertical: spacing.sm },
  cta: { paddingTop: spacing.sm },
});
