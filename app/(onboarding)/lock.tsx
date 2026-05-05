import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText, Button, Card } from '@/components';
import { palette, radius, spacing } from '@/theme/tokens';
import * as Settings from '@/features/settings/repository';
import * as Security from '@/services/security';
import { nowISO } from '@/utils/date';
import { useQueryClient } from '@tanstack/react-query';

type Choice = 'none' | 'pin' | 'biometric' | 'pin_or_biometric';

export default function Lock() {
  const router = useRouter();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<Choice>('none');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Security.getBiometricCapability().then((c) => setBioAvailable(c.available && c.enrolled));
  }, []);

  const needsPin = choice === 'pin' || choice === 'pin_or_biometric';
  const pinValid = needsPin ? /^[0-9]{4,8}$/.test(pin) && pin === confirm : true;

  async function finish() {
    setBusy(true);
    try {
      if (needsPin) {
        await Security.setPin(pin);
      }
      await Settings.update({ lockKind: choice, onboardedAt: nowISO() });
      await qc.invalidateQueries({ queryKey: ['settings'] });
      router.replace('/(tabs)/home');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded scroll>
      <View style={styles.head}>
        <ThemedText variant="labelCaps" tone="primary">SECURITY</ThemedText>
        <ThemedText variant="headlineMd">Lock the app?</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          Optional. Even without a lock, your data never leaves this device.
        </ThemedText>
      </View>

      <Card style={styles.card}>
        <Choice
          label="No lock"
          desc="I'll add it later"
          active={choice === 'none'}
          onPress={() => setChoice('none')}
        />
        <Choice
          label="PIN"
          desc="4 to 8 digits"
          active={choice === 'pin'}
          onPress={() => setChoice('pin')}
        />
        {bioAvailable && (
          <>
            <Choice
              label="Biometric only"
              desc="Fingerprint or face"
              active={choice === 'biometric'}
              onPress={() => setChoice('biometric')}
            />
            <Choice
              label="PIN + biometric"
              desc="Most flexible"
              active={choice === 'pin_or_biometric'}
              onPress={() => setChoice('pin_or_biometric')}
            />
          </>
        )}

        {needsPin && (
          <View style={styles.pinBlock}>
            <ThemedText variant="labelCaps" tone="muted">SET A PIN</ThemedText>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder="PIN (4–8 digits)"
              placeholderTextColor={palette.outline}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              style={styles.input}
              accessibilityLabel="PIN"
            />
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirm PIN"
              placeholderTextColor={palette.outline}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              style={styles.input}
              accessibilityLabel="Confirm PIN"
            />
            {!pinValid && pin.length > 0 && (
              <ThemedText variant="bodySm" tone="error">
                PINs must match and be 4–8 digits.
              </ThemedText>
            )}
          </View>
        )}
      </Card>

      <View style={styles.cta}>
        <Button
          label="Finish setup"
          loading={busy}
          disabled={!pinValid}
          onPress={finish}
          fullWidth
        />
      </View>
    </Screen>
  );
}

function Choice({
  label,
  desc,
  active,
  onPress,
}: {
  label: string;
  desc: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Card
      padded={false}
      style={{
        ...styles.choice,
        ...(active ? styles.choiceActive : {}),
      }}
    >
      <View style={{ flex: 1, padding: spacing.md }}>
        <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
          {label}
        </ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          {desc}
        </ThemedText>
      </View>
      <Button
        label={active ? 'Selected' : 'Choose'}
        variant={active ? 'primary' : 'secondary'}
        onPress={onPress}
        style={{ alignSelf: 'center', marginRight: spacing.sm }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.xl, gap: spacing.xs },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  pinBlock: { gap: spacing.sm, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: palette.outlineVariant,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    color: palette.onSurface,
  },
  cta: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  choice: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  choiceActive: {
    borderColor: palette.primary,
    borderWidth: 2,
  },
});
