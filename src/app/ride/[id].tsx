import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/AppIcon';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { RouteMap } from '@/components/RouteMap';
import { getRemainingSeats, useApp } from '@/store/AppProvider';
import { colors, radius, spacing, type } from '@/theme';

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { rides, applications, currentUser } = useApp();
  const ride = rides.find((item) => item.id === id);

  if (!ride) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundTitle}>这段拼车已经不在。</Text>
        <Button label="回到找拼车" onPress={() => router.replace('/search')} />
      </View>
    );
  }

  const isOwner = ride.owner.id === currentUser.id;
  const myApplication = applications.find(
    (application) =>
      application.rideId === ride.id &&
      application.applicant.id === currentUser.id &&
      !['rejected', 'withdrawn', 'expired'].includes(application.status),
  );
  const seats = getRemainingSeats(ride);

  const shareRide = () =>
    Share.share({
      message: [
        `雪约：${ride.origin} → ${ride.destination}`,
        `${ride.dateLabel} ${ride.startTime} 出发，预计 ${ride.eta} 到达`,
        `最低报价 ¥${ride.minPrice}/人，余 ${seats} 座。`,
      ].join('\n'),
    }).catch(() => undefined);

  const action = () => {
    if (isOwner) {
      router.push(`/owner/${ride.id}`);
      return;
    }
    if (myApplication) {
      router.push('/trips');
      return;
    }
    if (ride.status === 'full' || seats === 0) {
      Alert.alert('已经满员', '这辆车暂时没有空余座位，可以看看其他行程。');
      return;
    }
    router.push(`/apply/${ride.id}`);
  };

  const actionLabel = isOwner
    ? '管理申请与路线'
    : myApplication
      ? myApplication.status === 'countered'
        ? '查看车主回价'
        : '查看申请状态'
      : seats === 0
        ? '已经满员'
        : '申请加入';

  return (
    <View style={styles.root}>
      <View style={styles.mapArea}>
        <RouteMap available={ride.hasRouteSample} />
        <View style={[styles.mapHeader, { paddingTop: insets.top + 6 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <AppIcon name="back" size={20} color={colors.ink} />
          </Pressable>
          <View style={styles.version}>
            <Text style={styles.versionText}>当前路线 · 第 {ride.routeVersion} 版</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="分享行程"
            onPress={shareRide}
            style={styles.iconButton}
          >
            <AppIcon name="forward" size={18} color={colors.ink} />
          </Pressable>
        </View>
        <View style={[styles.mapSummary, { top: insets.top + 62 }]}>
          <View>
            <Text style={styles.mapMeta}>{ride.dateLabel} · {ride.startTime} 出发</Text>
            <Text style={styles.mapRoute}>{ride.origin.split(' · ').at(-1)} → {ride.destination}</Text>
          </View>
          <View style={styles.eta}>
            <Text style={styles.mapMeta}>预计 {ride.eta} 到达</Text>
            <Text style={styles.etaValue}>{ride.distanceKm || '—'} km · {ride.durationMin || '—'} 分</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[
          styles.sheetContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />
        <View style={styles.sheetTop}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{ride.destination.replace('雪场', '')}</Text>
            <Text style={styles.subtitle}>
              {ride.seatsTaken} / {ride.seatsTotal} 已确认 · {ride.stops.length > 2 ? `沿途接 ${ride.stops.length - 2} 人` : '直达'}
            </Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.price}>¥{ride.suggestedPrice} / 人</Text>
            <Text style={styles.minPrice}>最低 ¥{ride.minPrice}</Text>
          </View>
        </View>

        <View style={styles.ownerRow}>
          <Avatar user={ride.owner} size={36} />
          <View style={styles.ownerCopy}>
            <Text style={styles.ownerName}>{ride.owner.name}</Text>
            <Text style={styles.ownerMeta}>
              手机号已认证 · 同行 {ride.owner.ridesTogether} 次
            </Text>
          </View>
          <View style={styles.carTag}>
            <AppIcon name="car" size={14} color={colors.mintDark} />
            <Text style={styles.carTagText}>可带雪具</Text>
          </View>
        </View>

        <View style={styles.stops}>
          {ride.stops.map((stop) => (
            <View key={stop.id} style={styles.stopRow}>
              <View
                style={[
                  styles.stopDot,
                  stop.kind === 'pickup' && styles.stopDotPickup,
                  stop.kind === 'destination' && styles.stopDotEnd,
                ]}
              />
              <View style={styles.stopCopy}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopMeta}>
                  {stop.exactVisible ? stop.area : '已脱敏的接人区域'}
                </Text>
              </View>
              <Text style={styles.stopTime}>{stop.time}</Text>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>{ride.note}</Text>
        </View>

        <View style={styles.buttonRow}>
          <View style={styles.secondary}>
            <Button
              label="分享行程"
              variant="secondary"
              icon="forward"
              compact
              onPress={shareRide}
            />
          </View>
          <View style={styles.primary}>
            <Button
              label={actionLabel}
              onPress={action}
              disabled={!isOwner && !myApplication && seats === 0}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  mapArea: {
    height: '52%',
    minHeight: 380,
    overflow: 'hidden',
  },
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  version: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,.95)',
  },
  versionText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  mapSummary: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 5,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,.96)',
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  mapMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  mapRoute: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  eta: {
    alignItems: 'flex-end',
  },
  etaValue: {
    color: colors.berry,
    fontFamily: type.number,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  sheet: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    backgroundColor: colors.paper,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D7DEE2',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    marginTop: 4,
  },
  priceBox: {
    minWidth: 92,
    borderRadius: radius.md,
    backgroundColor: colors.pink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  price: {
    color: colors.pinkInk,
    fontFamily: type.number,
    fontSize: 15,
    fontWeight: '700',
  },
  minPrice: {
    color: '#89626D',
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 2,
  },
  ownerRow: {
    minHeight: 58,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.snow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  ownerCopy: {
    flex: 1,
  },
  ownerName: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
  ownerMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 2,
  },
  carTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carTagText: {
    color: colors.mintDark,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  stops: {
    marginTop: spacing.md,
  },
  stopRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#98CEB7',
  },
  stopDotPickup: {
    backgroundColor: '#B7A8E8',
  },
  stopDotEnd: {
    backgroundColor: colors.berry,
  },
  stopCopy: {
    flex: 1,
  },
  stopName: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
  stopMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 2,
  },
  stopTime: {
    color: colors.muted,
    fontFamily: type.number,
    fontSize: 9,
    fontWeight: '600',
  },
  note: {
    borderRadius: radius.md,
    backgroundColor: '#F3F7F9',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noteText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 16,
  },
  buttonRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondary: {
    flex: 0.8,
  },
  primary: {
    flex: 1.35,
  },
  notFound: {
    flex: 1,
    backgroundColor: colors.snow,
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.xl,
  },
  notFoundTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 23,
    fontWeight: '800',
  },
});
