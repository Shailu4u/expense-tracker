import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, ThemedText } from '@/components';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import { fromISO } from '@/utils/date';
import { useSmsForTransaction } from '../hooks';

interface Props {
  transactionId: string | undefined;
}

export function SmsSourceCard({ transactionId }: Props) {
  const { data: sms } = useSmsForTransaction(transactionId);
  const { palette } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!sms) return null;

  const lines = sms.body.split('\n');
  const showToggle = lines.length > 4 || sms.body.length > 240;

  return (
    <Card style={styles.card}>
      <ThemedText variant="labelCaps" tone="muted">SMS SOURCE</ThemedText>
      <ThemedText variant="bodySm" tone="muted">
        {sms.sender} · {fromISO(sms.receivedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
      </ThemedText>
      <View style={styles.bodyWrap}>
        <ThemedText variant="bodyBase" numberOfLines={expanded ? undefined : 4}>{sms.body}</ThemedText>
      </View>
      {showToggle && (
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
          <ThemedText variant="bodySm" style={{ color: palette.primary, fontWeight: '600', marginTop: spacing.xs }}>
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
});
