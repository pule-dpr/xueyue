import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme';

export function BrandLogo({
  size = 34,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <View style={styles.row} accessibilityLabel="雪约">
      <Image
        source={require('../../assets/logo.png')}
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            borderRadius: size * 0.31,
          },
        ]}
        resizeMode="cover"
      />
      {showWordmark ? <Text style={styles.wordmark}>雪约</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logo: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.95)',
  },
  wordmark: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
