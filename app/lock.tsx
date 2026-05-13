import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { Screen, ThemedText, Button, Card } from '@/components';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import * as Security from '@/services/security';
import { useLockStore } from '@/features/security/lockStore';
import { useSettings } from '@/features/security/hooks';

export default function LockScreen() {
  const unlock = useLockStore((s) => s.unlock);
  const { data: settings } = useSettings();
  const { palette } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  const lockKind = settings?.lockKind ?? 'none';
  const allowsBiometric = lockKind === 'biometric' || lockKind === 'pin_or_biometric';
  const allowsPin = lockKind === 'pin' || lockKind === 'pin_or_biometric';

  useEffect(() => {
    void Security.getBiometricCapability().then((c) => setBioAvailable(c.available && c.enrolled));
  }, []);

  useEffect(() => {
    if (allowsBiometric && bioAvailable) void tryBiometric();
  }, [allowsBiometric, bioAvailable]);

  async function tryBiometric() {
    setBusy(true);
    try {
      const ok = await Security.authenticateBiometric();
      if (ok) unlock();
    } finally {
      setBusy(false);
    }
  }

  async function tryPin() {
    setError(null);
    setBusy(true);
    try {
      const ok = await Security.verifyPin(pin);
      if (ok) { unlock(); setPin(''); }
      else setError('Incorrect PIN. Try again.');
    } catch {
      setError('Could not verify PIN.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded>
      <View style={styles.wrap}>
        <ThemedText variant="labelCaps" tone="muted">RUPEESAFE</ThemedText>
        <ThemedText variant="headlineMd">Welcome back</ThemedText>
        <ThemedText variant="bodySm" tone="muted">Your data is on this device only.</ThemedText>

        <Card style={styles.card}>
          {allowsPin && (
            <>
              <ThemedText variant="labelCaps" tone="muted">ENTER PIN</ThemedText>
              <TextInput
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
                autoFocus={!allowsBiometric}
                placeholder="• • • •"
                placeholderTextColor={palette.outline}
                style={[styles.input, { borderColor: palette.outlineVariant, color: palette.onSurface }]}
                accessibilityLabel="Enter PIN"
              />
              {error && <ThemedText variant="bodySm" tone="error">{error}</ThemedText>}
              <Button label="Unlock" onPress={tryPin} loading={busy} disabled={pin.length < 4} fullWidth />
            </>
          )}
          {allowsBiometric && bioAvailable && (
            <Button label="Use biometric" variant="secondary" onPress={tryBiometric} loading={busy && !pin} fullWidth style={{ marginTop: spacing.md }} />
          )}
          {!allowsPin && !bioAvailable && (
            <Button label="Continue" onPress={() => Alert.alert('Lock unavailable', 'No PIN is set and biometrics are not enrolled. Continue without lock.', [{ text: 'OK', onPress: unlock }])} fullWidth />
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.xl, gap: spacing.xs },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
});
