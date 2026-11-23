import { Image, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/AppIcon';
import { colors, type } from '@/theme';

export function RouteMap({
  compare = false,
  labels = true,
  available = true,
}: {
  compare?: boolean;
  labels?: boolean;
  available?: boolean;
}) {
  if (!available) {
    return (
      <View style={[styles.wrap, styles.pending]}>
        <AppIcon name="route" size={26} color={colors.inkSoft} />
        <Text style={styles.pendingTitle}>路线待计算</Text>
        <Text style={styles.pendingText}>接入高德地图后，将按实际道路与途经点生成路线。</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Image
        source={
          compare
            ? require('../../assets/map/route-compare-strip.jpg')
            : require('../../assets/map/route-current.jpg')
        }
        style={StyleSheet.absoluteFill}
        resizeMode={compare ? 'contain' : 'cover'}
        accessibilityLabel={compare ? '当前路线与加入后路线对比地图' : '从世纪广场到松花湖的真实道路路线地图'}
      />
      {labels && !compare ? (
        <>
          <Text style={[styles.label, styles.origin]}>世纪广场</Text>
          <Text style={[styles.label, styles.pickup]}>生态大街 · 接 1 人</Text>
          <Text style={[styles.label, styles.destination]}>松花湖 A口</Text>
        </>
      ) : null}
      <Text style={styles.credit}>地图样例 © OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#E5EEE9',
  },
  label: {
    position: 'absolute',
    borderRadius: 7,
    backgroundColor: 'rgba(24,37,47,.92)',
    color: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  origin: {
    left: '7%',
    top: '60%',
  },
  pickup: {
    left: '42%',
    top: '34%',
  },
  destination: {
    right: '5%',
    top: '26%',
  },
  credit: {
    position: 'absolute',
    right: 8,
    bottom: 7,
    color: 'rgba(31,45,38,.68)',
    fontFamily: type.body,
    fontSize: 7,
  },
  pending: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#EAF1F4',
  },
  pendingTitle: {
    marginTop: 8,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '700',
  },
  pendingText: {
    maxWidth: 220,
    marginTop: 4,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 15,
    textAlign: 'center',
  },
});
