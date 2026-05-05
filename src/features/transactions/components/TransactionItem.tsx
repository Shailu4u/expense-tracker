import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CategoryIcon, MoneyText, ThemedText } from '@/components';
import { palette, spacing } from '@/theme/tokens';
import type { TransactionRow } from '@/features/transactions/repository';
import type { Category } from '@/features/categories/repository';
import { PAYMENT_MODE_LABELS } from '@/types';
import { formatTimeLabel } from '@/utils/date';

interface Props {
  transaction: TransactionRow;
  category?: Category;
}

export function TransactionItem({ transaction, category }: Props) {
  const router = useRouter();
  const isIncome = transaction.kind === 'income';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: transaction.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${transaction.merchant ?? category?.name ?? 'Transaction'}, ${transaction.amountPaise / 100} rupees`}
      android_ripple={{ color: palette.outlineVariant }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: palette.surfaceContainerLow }]}
    >
      <CategoryIcon icon={category?.icon ?? 'category'} color={category?.color ?? '#6E7976'} size={40} />
      <View style={styles.body}>
        <ThemedText variant="bodyBase" numberOfLines={1} style={{ fontWeight: '600' }}>
          {transaction.merchant?.trim() || category?.name || 'Transaction'}
        </ThemedText>
        <ThemedText variant="bodySm" tone="muted" numberOfLines={1}>
          {category?.name ?? 'Uncategorised'} · {PAYMENT_MODE_LABELS[transaction.paymentMode]} · {formatTimeLabel(transaction.occurredAt)}
        </ThemedText>
      </View>
      <MoneyText
        paise={transaction.amountPaise}
        kind={transaction.kind}
        signed
        tone={isIncome ? 'positive' : 'default'}
        size="base"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  body: { flex: 1, gap: 2 },
});
