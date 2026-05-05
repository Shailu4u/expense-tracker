import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

type IconName = 'home' | 'list' | 'add' | 'budget' | 'more';

interface Props {
  name: IconName;
  color: string;
  focused: boolean;
  size?: number;
}

export function TabBarIcon({ name, color, focused, size = 24 }: Props) {
  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {paths(name, color, focused)}
      </Svg>
    </View>
  );
}

function paths(name: IconName, color: string, focused: boolean) {
  const stroke = color;
  const fill = focused ? color : 'none';
  const sw = focused ? 2 : 1.6;
  switch (name) {
    case 'home':
      return (
        <Path
          d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
          fill={focused ? color + '22' : 'none'}
        />
      );
    case 'list':
      return (
        <>
          <Path d="M4 6h16M4 12h16M4 18h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    case 'add':
      return (
        <>
          <Circle cx={12} cy={12} r={10} stroke={stroke} strokeWidth={sw} fill={focused ? color + '22' : 'none'} />
          <Path d="M12 7v10M7 12h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    case 'budget':
      return (
        <>
          <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={sw} fill={focused ? color + '22' : 'none'} />
          <Path d="M12 3a9 9 0 019 9h-9V3z" fill={focused ? color : color + '44'} />
        </>
      );
    case 'more':
      return (
        <>
          <Circle cx={6} cy={12} r={1.6} fill={stroke} />
          <Circle cx={12} cy={12} r={1.6} fill={stroke} />
          <Circle cx={18} cy={12} r={1.6} fill={stroke} />
        </>
      );
  }
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
