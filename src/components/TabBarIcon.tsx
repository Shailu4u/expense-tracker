import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/features/theme/themeStore';

type IconName = 'home' | 'list' | 'add' | 'budget' | 'more';

interface Props {
  name: IconName;
  color: string;
  focused: boolean;
  size?: number;
}

export function TabBarIcon({ name, color, focused, size = 24 }: Props) {
  const { palette } = useTheme();
  return (
    <View style={[styles.wrap, focused && { backgroundColor: palette.tabActive }]}>
      <MaterialCommunityIcons
        name={iconName(name, focused)}
        size={size}
        color={color}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

function iconName(name: IconName, focused: boolean): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  switch (name) {
    case 'home': return focused ? 'home-variant' : 'home-variant-outline';
    case 'list': return focused ? 'format-list-bulleted' : 'format-list-bulleted-square';
    case 'add': return focused ? 'plus-circle' : 'plus-circle-outline';
    case 'budget': return focused ? 'wallet' : 'wallet-outline';
    case 'more': return focused ? 'dots-grid' : 'dots-grid';
  }
}

const styles = StyleSheet.create({
  wrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
});
