import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Button, Card } from '@/components';
import { spacing, palette } from '@/theme/tokens';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen padded>
      <View style={styles.hero}>
        <ThemedText variant="labelCaps" tone="primary">RUPEESAFE</ThemedText>
        <ThemedText variant="displayLg">Track every rupee. Quietly.</ThemedText>
        <ThemedText variant="bodyBase" tone="muted">
          A private, offline-first expense tracker built for India. No account,
          no cloud, no surprises — your data stays on this device.
        </ThemedText>
      </View>

      <Card style={styles.card}>
        <ThemedText variant="labelCaps" tone="muted">WHAT YOU GET</ThemedText>
        <Bullet text="Quick UPI / cash / card entry" />
        <Bullet text="Monthly budgets that nudge, not nag" />
        <Bullet text="Local backup &amp; CSV export" />
        <Bullet text="Optional PIN or biometric lock" />
      </Card>

      <View style={styles.cta}>
        <Button label="Get started" onPress={() => router.push('/(onboarding)/privacy')} fullWidth />
      </View>
    </Screen>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.dot} />
      <ThemedText variant="bodyBase">{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: spacing.xl, gap: spacing.sm },
  card: { marginTop: spacing.xl, gap: spacing.sm },
  cta: { marginTop: 'auto', paddingTop: spacing.xl, paddingBottom: spacing.lg },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.primary },
});
