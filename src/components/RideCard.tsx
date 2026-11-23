import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/AppIcon';
import { Avatar } from '@/components/Avatar';
import { tapFeedback } from '@/lib/haptics';
import { getRemainingSeats } from '@/store/AppProvider';
import { colors, radius, shadow, spacing, type } from '@/theme';
import type { Ride } from '@/types';

export function RideCard({ ride }: { ride: Ride }) {
  const seats = getRemainingSeats(ride);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`查看去${ride.destination}的拼车，${ride.startTime}出发`}
      onPress={() => {
        tapFeedback();
        router.push(`/ride/${ride.id}`);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.owner}>
          <Avatar user={ride.owner} size={31} />
          <View>
            <Text style={styles.name}>{ride.owner.name}</Text>
            <Text style={styles.meta}>
              手机号已认证 · 同行 {ride.owner.ridesTogether} 次
            </Text>
          </View>
        </View>
        <View style={styles.verify}>
          <Text style={styles.verifyText}>可顺路接</Text>
        </View>
      </View>

      <View style={styles.main}>
        <View>
          <Text style={styles.time}>{ride.startTime}</Text>
          <Text style={styles.timeNote}>{ride.dateLabel}</Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={styles.price}>¥{ride.suggestedPrice}</Text>
          <Text style={styles.priceNote}>报价 / 人</Text>
        </View>
      </View>

      <View style={styles.routeBox}>
        <View style={styles.routeDot} />
        <View style={styles.routeCopy}>
          <Text style={styles.routeTitle}>{ride.origin} → {ride.destination}</Text>
          <Text style={styles.routeMeta}>
            {ride.stops.length > 2 ? `途经 ${ride.stops.length - 2} 个接人点 · ` : ''}
            预计 {ride.eta} 到达
          </Text>
        </View>
        <View style={styles.seatPill}>
          <Text style={styles.seatText}>{seats > 0 ? `余 ${seats} 座` : '已满员'}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.tags}>
          {ride.rules.slice(0, 2).map((rule) => (
            <Text key={rule} style={styles.tag}>{rule}</Text>
          ))}
        </View>
        <View style={styles.link}>
          <Text style={styles.linkText}>查看路线</Text>
          <AppIcon name="forward" size={13} color={colors.blue} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,.92)',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,.07)',
    padding: spacing.lg,
    ...shadow,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 11,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 2,
  },
  verify: {
    backgroundColor: colors.mint,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  verifyText: {
    color: colors.mintDark,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  main: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  time: {
    color: colors.ink,
    fontFamily: type.number,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 32,
  },
  timeNote: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 2,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  price: {
    color: colors.berry,
    fontFamily: type.number,
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  priceNote: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 2,
  },
  routeBox: {
    marginTop: spacing.md,
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: '#EDF7F2',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.berry,
  },
  routeCopy: {
    flex: 1,
  },
  routeTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
  routeMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 3,
  },
  seatPill: {
    borderRadius: radius.sm,
    backgroundColor: colors.lavender,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  seatText: {
    color: colors.lavenderInk,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tags: {
    flexDirection: 'row',
    gap: 5,
  },
  tag: {
    borderRadius: 6,
    backgroundColor: '#F0F4F6',
    color: colors.muted,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontFamily: type.body,
    fontSize: 8,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    color: colors.blue,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
});
