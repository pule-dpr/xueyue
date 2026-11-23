import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme';
import type { User } from '@/types';

export function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  return (
    <View
      accessibilityLabel={`${user.name}的头像`}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: user.color,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.31 }]}>{user.initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.ink,
    fontFamily: type.body,
    fontWeight: '800',
  },
});
