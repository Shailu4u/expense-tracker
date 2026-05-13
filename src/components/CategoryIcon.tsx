import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/features/theme/themeStore';

interface Props {
  icon: string; // material symbol name; will be best-effort mapped
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

// Map our seed material-symbols-outlined names to MaterialIcons names. Keep
// fallbacks generous; unknown names render as 'category'.
const ICON_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  apartment: 'apartment',
  shopping_basket: 'shopping-basket',
  local_gas_station: 'local-gas-station',
  sim_card: 'sim-card',
  account_balance: 'account-balance',
  savings: 'savings',
  cleaning_services: 'cleaning-services',
  medication: 'medication',
  restaurant: 'restaurant',
  flight: 'flight',
  shopping_bag: 'shopping-bag',
  receipt_long: 'receipt-long',
  category: 'category',
  work: 'work',
  undo: 'undo',
  paid: 'paid',
  trending_up: 'trending-up',
  trending_down: 'trending-down',
};

function tint(hex: string, fallback: string, alpha = 0.15): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const v = parseInt(m[1]!, 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function CategoryIcon({ icon, color, size = 40, style }: Props) {
  const { palette } = useTheme();
  const symbol = ICON_MAP[icon] ?? 'category';
  const inner = Math.round(size * 0.55);
  return (
    <View
      style={[
        styles.bubble,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tint(color, palette.surfaceContainer, 0.18) },
        style,
      ]}
    >
      <MaterialIcons name={symbol} size={inner} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
