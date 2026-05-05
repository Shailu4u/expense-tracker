import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Button, Card } from '@/components';
import { spacing } from '@/theme/tokens';

export default function Privacy() {
  const router = useRouter();
  return (
    <Screen padded scroll>
      <View style={styles.head}>
        <ThemedText variant="labelCaps" tone="primary">PRIVACY</ThemedText>
        <ThemedText variant="headlineMd">Your data, your device.</ThemedText>
      </View>

      <Card style={styles.card}>
        <ThemedText variant="bodyBase">
          RupeeSafe stores your transactions, budgets, and receipts entirely on
          this phone. There is no account to sign up for, and the app does not
          send your data to any server.
        </ThemedText>
        <ThemedText variant="bodyBase" tone="muted">
          To export or back up, you choose where the file goes — a local folder,
          email, or cloud drive.
        </ThemedText>
        <ThemedText variant="bodyBase" tone="muted">
          If you grant SMS access on Android, messages are read on this device
          only and never uploaded.
        </ThemedText>
      </Card>

      <View style={styles.cta}>
        <Button label="Got it" onPress={() => router.push('/(onboarding)/setup')} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.xl, gap: spacing.xs },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  cta: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
});
