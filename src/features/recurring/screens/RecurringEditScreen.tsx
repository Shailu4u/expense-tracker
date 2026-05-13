import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Screen,
  ThemedText,
  Card,
  Button,
  TextField,
  CategoryPicker,
  PaymentModePicker,
} from '@/components';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { useCategoriesForKind } from '@/features/categories/hooks';
import { useCreateRecurring, useUpdateRecurring, useRecurringById } from '../hooks';
import { rupeesToPaise } from '@/utils/money';
import { addMonths, addWeeks, startOfDay } from 'date-fns';
import type { PaymentMode, TransactionKind } from '@/types';

export function RecurringEditScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = id && id !== 'new' ? id : null;
  const { data: existing } = useRecurringById(editing ?? undefined);

  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [cadence, setCadence] = useState<'monthly' | 'weekly'>('monthly');
  const [reminderHours, setReminderHours] = useState('24');
  const { data: categories = [] } = useCategoriesForKind(kind);
  const create = useCreateRecurring();
  const update = useUpdateRecurring();

  useEffect(() => {
    if (!existing) return;
    setKind(existing.kind);
    setAmount(String(existing.amountPaise / 100));
    setMerchant(existing.templateMeta?.merchant ?? '');
    setNotes(existing.templateMeta?.notes ?? '');
    setCategoryId(existing.categoryId);
    setPaymentMode(existing.paymentMode);
    setCadence(existing.cadence === 'weekly' ? 'weekly' : 'monthly');
    setReminderHours(
      existing.reminderMinutesBefore != null ? String(existing.reminderMinutesBefore / 60) : '',
    );
  }, [existing]);

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(categories[0]!.id);
  }, [categories, categoryId]);

  const amtPaise = rupeesToPaise(Number(amount) || 0);
  const valid = amtPaise > 0 && !!categoryId;

  async function save() {
    if (!valid || !categoryId) return;
    const today = startOfDay(new Date());
    const next = cadence === 'weekly' ? addWeeks(today, 1) : addMonths(today, 1);
    const reminderMinutes = Number(reminderHours);
    const payload = {
      kind,
      amountPaise: amtPaise,
      categoryId,
      paymentMode,
      cadence,
      nextDue: existing?.nextDue ?? next.toISOString(),
      reminderMinutesBefore: Number.isFinite(reminderMinutes) && reminderMinutes > 0
        ? Math.round(reminderMinutes * 60)
        : null,
      templateMeta: {
        merchant: merchant.trim() || undefined,
        notes: notes.trim() || undefined,
      },
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing, patch: payload });
      } else {
        await create.mutateAsync(payload);
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <Screen padded scroll>
      <View style={styles.head}>
        <ThemedText variant="labelCaps" tone="muted">{editing ? 'EDIT' : 'NEW'} RECURRING</ThemedText>
        <ThemedText variant="headlineMd">{merchant || 'Bill / SIP / EMI'}</ThemedText>
      </View>

      <Card style={styles.card}>
        <View style={styles.kindRow}>
          {(['expense', 'income'] as TransactionKind[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[
                styles.kindChip,
                { borderColor: palette.outlineVariant, backgroundColor: palette.surfaceContainerLowest },
                kind === k && { backgroundColor: palette.primaryContainer, borderColor: palette.primaryContainer },
              ]}
            >
              <ThemedText
                variant="bodyBase"
                style={{
                  color: kind === k ? palette.onPrimary : palette.onSurface,
                  fontWeight: '600',
                }}
              >
                {k === 'expense' ? 'Expense' : 'Income'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <TextField label="Amount in ₹" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <TextField label="Name / Merchant" value={merchant} onChangeText={setMerchant} placeholder="e.g. Spotify, Rent, SIP" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />

        <ThemedText variant="labelCaps" tone="muted">CATEGORY</ThemedText>
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />

        <ThemedText variant="labelCaps" tone="muted">PAYMENT MODE</ThemedText>
        <PaymentModePicker value={paymentMode} onChange={setPaymentMode} />

        <ThemedText variant="labelCaps" tone="muted">FREQUENCY</ThemedText>
        <View style={styles.row}>
          {(['monthly', 'weekly'] as const).map((c) => (
            <Pressable
              key={c}
              onPress={() => setCadence(c)}
              style={[
                styles.kindChip,
                { borderColor: palette.outlineVariant, backgroundColor: palette.surfaceContainerLowest },
                cadence === c && { backgroundColor: palette.primaryContainer, borderColor: palette.primaryContainer },
              ]}
            >
              <ThemedText
                variant="bodyBase"
                style={{
                  color: cadence === c ? palette.onPrimary : palette.onSurface,
                  fontWeight: '600',
                }}
              >
                {c === 'monthly' ? 'Monthly' : 'Weekly'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <TextField
          label="Remind me (hours before)"
          keyboardType="decimal-pad"
          value={reminderHours}
          onChangeText={setReminderHours}
          placeholder="24"
        />
      </Card>

      <View style={styles.cta}>
        <Button label={editing ? 'Save' : 'Create recurring'} disabled={!valid} onPress={save} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.xl, gap: spacing.xs },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  cta: { marginTop: spacing.lg },
  kindRow: { flexDirection: 'row', gap: spacing.sm },
  kindChip: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm },
});
