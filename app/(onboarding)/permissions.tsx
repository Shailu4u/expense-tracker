import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen, ThemedText, Button, Card } from '@/components';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';
import * as SmsRepo from '@/features/sms-import/repository';
import * as NotificationsService from '@/services/notifications';

type PermStatus = 'unknown' | 'granted' | 'denied';

interface PermState {
  sms: PermStatus;
  camera: PermStatus;
  notifications: PermStatus;
}

export default function Permissions() {
  const router = useRouter();
  const isAndroid = Platform.OS === 'android';

  const [perms, setPerms] = useState<PermState>({
    sms: 'unknown',
    camera: 'unknown',
    notifications: 'unknown',
  });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void checkAll();
  }, []);

  async function checkAll() {
    const next: PermState = { sms: 'unknown', camera: 'unknown', notifications: 'unknown' };

    if (isAndroid) {
      next.sms = (await SmsRepo.checkPermission()) ? 'granted' : 'unknown';
    } else {
      next.sms = 'granted'; // iOS: not applicable, treat as satisfied
    }

    const camStatus = await ImagePicker.getCameraPermissionsAsync();
    next.camera = camStatus.granted ? 'granted' : (camStatus.canAskAgain ? 'unknown' : 'denied');

    const Notifications = await import('expo-notifications');
    const notifStatus = await Notifications.getPermissionsAsync();
    next.notifications = notifStatus.granted ? 'granted' : (notifStatus.canAskAgain ? 'unknown' : 'denied');

    setPerms(next);
  }

  async function requestSms() {
    const granted = await SmsRepo.requestPermission();
    setPerms((p) => ({ ...p, sms: granted ? 'granted' : 'denied' }));
    if (granted) {
      triggerBackgroundImport();
    }
  }

  async function requestCamera() {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    setPerms((p) => ({ ...p, camera: result.granted ? 'granted' : 'denied' }));
  }

  async function requestNotifications() {
    const granted = await NotificationsService.ensurePermissions();
    setPerms((p) => ({ ...p, notifications: granted ? 'granted' : 'denied' }));
  }

  function triggerBackgroundImport() {
    setImporting(true);
    SmsRepo.importSinceLast(90)
      .catch(() => {})
      .finally(() => setImporting(false));
  }

  function next() {
    router.push('/(onboarding)/lock');
  }

  return (
    <Screen padded scroll>
      <View style={styles.head}>
        <ThemedText variant="labelCaps" tone="primary">PERMISSIONS</ThemedText>
        <ThemedText variant="headlineMd">Allow access to get the most out of the app</ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          All data stays on your device. Nothing is uploaded or shared.
        </ThemedText>
      </View>

      <View style={styles.list}>
        {isAndroid && (
          <PermRow
            icon="💬"
            title="Read SMS"
            description="Auto-detect transactions from bank messages. Never used for anything else."
            status={perms.sms}
            importing={importing && perms.sms === 'granted'}
            onRequest={requestSms}
          />
        )}

        <PermRow
          icon="📷"
          title="Camera"
          description="Capture receipts from the transaction detail screen."
          status={perms.camera}
          onRequest={requestCamera}
        />

        <PermRow
          icon="🔔"
          title="Notifications"
          description="Get reminded about budget limits and recurring bills."
          status={perms.notifications}
          onRequest={requestNotifications}
        />
      </View>

      <View style={styles.cta}>
        <Button label="Continue" onPress={next} fullWidth />
        <ThemedText variant="bodySm" tone="muted" style={styles.skip}>
          You can grant permissions later from the More screen.
        </ThemedText>
      </View>
    </Screen>
  );
}

interface PermRowProps {
  icon: string;
  title: string;
  description: string;
  status: PermStatus;
  importing?: boolean;
  onRequest: () => void;
}

function PermRow({ icon, title, description, status, importing = false, onRequest }: PermRowProps) {
  const { palette } = useTheme();
  const granted = status === 'granted';
  const denied = status === 'denied';

  return (
    <Card style={[styles.row, granted && { borderColor: palette.primary, borderWidth: 1 }]}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
      <View style={styles.rowText}>
        <ThemedText variant="bodyBase" style={{ fontWeight: '600' }}>
          {title}
        </ThemedText>
        <ThemedText variant="bodySm" tone="muted">
          {description}
        </ThemedText>
        {importing && (
          <ThemedText variant="bodySm" tone="primary">
            Importing transactions…
          </ThemedText>
        )}
        {denied && (
          <ThemedText variant="bodySm" tone="error">
            Denied. Enable from device Settings.
          </ThemedText>
        )}
      </View>
      {granted ? (
        <ThemedText style={[styles.check, { color: palette.primary }]}>✓</ThemedText>
      ) : (
        <Button
          label="Allow"
          variant="secondary"
          onPress={onRequest}
          style={styles.allowBtn}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.xl, gap: spacing.xs },
  list: { marginTop: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  icon: { fontSize: 28, lineHeight: 36 },
  check: { fontSize: 22, alignSelf: 'center' },
  allowBtn: { alignSelf: 'center' },
  cta: { paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm },
  skip: { textAlign: 'center' },
});
