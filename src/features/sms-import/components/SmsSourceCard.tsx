import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, ThemedText } from '@/components';
import { palette, spacing } from '@/theme/tokens';
import { fromISO } from '@/utils/date';
import { useSmsForTransaction } from '../hooks';

interface Props {
  transactionId: string | undefined;
}

// Shows the raw SMS that produced an auto-imported transaction. Renders
// nothing when there is no linked SMS, so it's safe to drop into any
// transaction view/edit screen.
export function SmsSourceCard({ transactionId }: Props) {
  const { data: sms } = useSmsForTransaction(transactionId);
  const [expanded, setExpanded] = useState(false);

  if (!sms) return null;

  const lines = sms.body.split('\n');
  // Heuristic: real bank SMS that span >4 visual lines either contain
  // explicit newlines (HDFC multi-line) or are very long single paragraphs.
  const showToggle = lines.length > 4 || sms.body.length > 240;

  return (
    <Card style={styles.card}>
      <ThemedText variant="labelCaps" tone="muted">
        SMS SOURCE
      </ThemedText>
      <ThemedText variant="bodySm" tone="muted">
        {sms.sender} ·{' '}
        {fromISO(sms.receivedAt).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </ThemedText>
      <View style={styles.bodyWrap}>
        <ThemedText
          variant="bodyBase"
          numberOfLines={expanded ? undefined : 4}
        >
          {sms.body}
        </ThemedText>
      </View>
      {showToggle && (
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
          <ThemedText variant="bodySm" style={styles.toggle}>
            {expanded ? 'View less' : 'View more'}
          </ThemedText>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.xs },
  bodyWrap: { marginTop: spacing.xs },
  toggle: { color: palette.primary, fontWeight: '600', marginTop: spacing.xs },
});
