import { useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen, ThemedText, Card, Button, GradientPanel } from '@/components';
import { spacing } from '@/theme/tokens';
import { useSettings } from '@/features/security/hooks';
import { useLockStore } from '@/features/security/lockStore';
import * as Settings from '@/features/settings/repository';
import { clearPin } from '@/services/security';
import { insertSampleData, clearAllData } from '@/services/sampleData';
import { useThemeStore, useTheme, type ThemeMode } from '@/features/theme/themeStore';
import { updateTheme } from '@/features/theme/hooks';

export default function SettingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const setConfigured = useLockStore((s) => s.setConfigured);
  const themeMode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { palette: p } = useTheme();
  const [busy, setBusy] = useState(false);

  async function handleThemeChange(mode: ThemeMode) {
    setMode(mode);
    try {
      await updateTheme(mode, qc);
    } catch (e) {
      Alert.alert('Could not change theme', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  if (!settings) {
    return (
      <Screen scroll>
        <ThemedText variant="bodyBase" tone="muted">
          Loading…
        </ThemedText>
      </Screen>
    );
  }
  const grace = settings.lockGraceSeconds;

  function disableLock() {
    Alert.alert(
      'Turn off app lock?',
      'Your data stays on the device. The lock screen will no longer appear.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await clearPin();
              await Settings.update({ lockKind: 'none' });
              setConfigured(false, grace);
              await qc.invalidateQueries({ queryKey: ['settings'] });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen scroll style={styles.scroll}>
      <GradientPanel style={styles.header}>
        <ThemedText variant="labelCaps" tone="inverse">
          SETTINGS
        </ThemedText>
        <ThemedText variant="headlineMd" tone="inverse">
          Privacy-first controls for your device.
        </ThemedText>
      </GradientPanel>

      <Card>
        <ThemedText variant="labelCaps" tone="muted">
          SECURITY
        </ThemedText>
        <View style={[styles.row, { borderTopColor: p.outlineVariant }]}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
              App lock
            </ThemedText>
            <ThemedText variant="bodySm" tone="muted">
              {settings.lockKind === 'none'
                ? 'Off'
                : settings.lockKind === 'pin'
                  ? 'PIN'
                  : 'Biometric + PIN'}
            </ThemedText>
          </View>
          {settings.lockKind === 'none' ? (
            <Button label="Turn on" onPress={() => router.push('/(onboarding)/setup')} />
          ) : (
            <Button label="Turn off" variant="danger" onPress={disableLock} loading={busy} />
          )}
        </View>
      </Card>

      <Card>
        <ThemedText variant="labelCaps" tone="muted">
          APPEARANCE
        </ThemedText>
        <ThemedText variant="bodyBase" style={{ fontWeight: '600', marginTop: spacing.sm }}>
          Theme
        </ThemedText>
        <ThemedText variant="bodySm" tone="muted" style={{ marginBottom: spacing.md }}>
          Choose how the app looks
        </ThemedText>
        <View style={styles.themeGrid}>
          <ThemeOption label="Light" mode="light" selected={themeMode === 'light'} palette={p} onPress={() => handleThemeChange('light')} />
          <ThemeOption label="Dark" mode="dark" selected={themeMode === 'dark'} palette={p} onPress={() => handleThemeChange('dark')} />
          <ThemeOption label="System" mode="system" selected={themeMode === 'system'} palette={p} onPress={() => handleThemeChange('system')} />
        </View>
      </Card>

      <Card>
        <ThemedText variant="labelCaps" tone="muted">
          DATA
        </ThemedText>
        <Button
          label="Manage categories"
          variant="secondary"
          onPress={() => router.push('/categories')}
        />
        <Button
          label="Backup & Export"
          variant="secondary"
          onPress={() => router.push('/backup')}
        />
        <Button
          label="Load sample data"
          variant="secondary"
          onPress={async () => {
            const r = await insertSampleData();
            await qc.invalidateQueries();
            Alert.alert('Loaded', `Inserted ${r.inserted} sample transactions.`);
          }}
        />
        <Button
          label="Delete all data"
          variant="danger"
          onPress={() => {
            Alert.alert(
              'Delete all data?',
              'This removes every transaction, budget, recurring item, receipt, and SMS history on this device. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Continue',
                  style: 'destructive',
                  onPress: () => {
                    Alert.alert(
                      'Are you absolutely sure?',
                      'Type-confirm replaced by a final tap. Proceed?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete everything',
                          style: 'destructive',
                          onPress: async () => {
                            await clearAllData();
                            await qc.invalidateQueries();
                            Alert.alert('Deleted', 'Your data is cleared.');
                          },
                        },
                      ],
                    );
                  },
                },
              ],
            );
          }}
        />
      </Card>

      <Card>
        <ThemedText variant="labelCaps" tone="muted">
          ABOUT
        </ThemedText>
        <ThemedText variant="bodyBase">RupeeSafe</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          Privacy-first. No accounts. No cloud. All data stays on this device.
        </ThemedText>
      </Card>
    </Screen>
  );
}

function ThemeOption({
  label,
  mode,
  selected,
  palette: p,
  onPress,
}: {
  label: string;
  mode: ThemeMode;
  selected: boolean;
  palette: ReturnType<typeof useTheme>['palette'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.themeOption,
        { borderColor: p.outlineVariant, backgroundColor: p.surfaceContainerLowest },
        selected && { borderColor: p.primary, backgroundColor: p.primaryContainer },
      ]}
    >
      {mode === 'system' ? (
        <View style={[styles.themeDotSystem, { borderColor: p.outline }]}>
          <View style={[styles.themeDotSystemHalf, { backgroundColor: '#fbf9f9' }]} />
          <View style={[styles.themeDotSystemHalf, { backgroundColor: '#1a1a1a' }]} />
        </View>
      ) : (
        <View
          style={[
            styles.themeDot,
            { borderColor: p.outline },
            mode === 'light' && { backgroundColor: '#fbf9f9' },
            mode === 'dark' && { backgroundColor: '#1a1a1a' },
          ]}
        />
      )}
      <ThemedText
        variant="bodySm"
        style={{ fontWeight: selected ? '600' : '400', color: selected ? p.primary : p.onSurface }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, marginBottom: spacing.md },
  scroll: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  themeDotSystem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    flexDirection: 'row',
  },
  themeDotSystemHalf: {
    flex: 1,
  },
});
