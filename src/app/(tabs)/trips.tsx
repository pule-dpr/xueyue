import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/AppIcon';
import { Avatar } from '@/components/Avatar';
import { confirmAction } from '@/lib/confirm';
import { successFeedback } from '@/lib/haptics';
import { getRemainingSeats, useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, shadow, spacing, type } from '@/theme';
import type { Application, Ride } from '@/types';

type Segment = 'joined' | 'owned';

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const {
    rides,
    applications,
    currentUser,
    acceptCounterOffer,
    declineCounterOffer,
    withdrawApplication,
  } = useApp();
  const [segment, setSegment] = useState<Segment>('joined');
  const ownedRides = rides.filter((ride) => ride.owner.id === currentUser.id);
  const joinedApplications = applications.filter(
    (application) => application.applicant.id === currentUser.id,
  );

  const acceptCounter = (application: Application) => {
    const result = acceptCounterOffer(application.id);
    if (!result.ok) {
      Alert.alert('没有接受回价', result.message);
      return;
    }
    successFeedback();
    Alert.alert('已接受回价', '座位和最终价格已经确认，路线将更新。');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 108 }]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>我的行程</Text>
            <Text style={styles.subtitle}>申请、审核与已经确认的座位，都在这里。</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="发布拼车"
            onPress={() => router.push('/publish')}
            style={styles.add}
          >
            <AppIcon name="plus" size={20} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.segment}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: segment === 'joined' }}
            onPress={() => setSegment('joined')}
            style={[styles.segmentItem, segment === 'joined' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, segment === 'joined' && styles.segmentTextActive]}>
              我加入的
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: segment === 'owned' }}
            onPress={() => setSegment('owned')}
            style={[styles.segmentItem, segment === 'owned' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, segment === 'owned' && styles.segmentTextActive]}>
              我发起的
            </Text>
          </Pressable>
        </View>

        {segment === 'joined' ? (
          <View style={styles.list}>
            {joinedApplications.map((application) => {
              const ride = rides.find((item) => item.id === application.rideId);
              if (!ride) return null;
              return (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  ride={ride}
                  onAccept={() => acceptCounter(application)}
                  onDecline={() => {
                    declineCounterOffer(application.id);
                    successFeedback();
                  }}
                  onWithdraw={() => {
                    confirmAction({
                      title: '撤回这份申请？',
                      message: '撤回后不会占用座位，也不会改变路线。',
                      confirmLabel: '撤回申请',
                      onConfirm: () => withdrawApplication(application.id),
                    });
                  }}
                />
              );
            })}
            {joinedApplications.length === 0 ? (
              <EmptyState
                title="还没有申请过拼车。"
                text="找到一个合适的空位，把人数、雪具和报价一起发出去。"
                action="去找拼车"
                onPress={() => router.push('/search')}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {ownedRides.map((ride) => (
              <OwnerTripCard key={ride.id} ride={ride} applications={applications} />
            ))}
            {ownedRides.length === 0 ? (
              <EmptyState
                title="还没有发起拼车。"
                text="把空座、路线和最低报价写清楚，让顺路的人来申请。"
                action="发布拼车"
                onPress={() => router.push('/publish')}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ApplicationCard({
  application,
  ride,
  onAccept,
  onDecline,
  onWithdraw,
}: {
  application: Application;
  ride: Ride;
  onAccept: () => void;
  onDecline: () => void;
  onWithdraw: () => void;
}) {
  const counter = application.counterPerPerson;
  const status = applicationStatus(application);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardTitle}>{ride.destination}</Text>
          <Text style={styles.cardMeta}>
            {ride.dateLabel} · {ride.startTime} · {ride.owner.name}的车
          </Text>
        </View>
        <View style={[styles.status, status.style]}>
          <Text style={[styles.statusText, status.textStyle]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.appSummary}>
        <Avatar user={application.applicant} size={34} />
        <View style={styles.appCopy}>
          <Text style={styles.appText}>{application.people} 人 · {application.gearCount} 副雪具</Text>
          <Text style={styles.appMeta}>{application.pickup}</Text>
        </View>
        <Text style={styles.appPrice}>
          ¥{counter ?? application.offerPerPerson}
          <Text style={styles.appPriceUnit}> /人</Text>
        </Text>
      </View>
      {application.status === 'countered' && counter ? (
        <View style={styles.counterBox}>
          <Text style={styles.counterText}>车主回价 ¥{counter} / 人，共 ¥{counter * application.people}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="暂不接受回价"
              onPress={onDecline}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>再想想</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="接受回价"
              onPress={onAccept}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionText}>接受回价</Text>
            </Pressable>
          </View>
        </View>
      ) : application.status === 'pending' ? (
        <View style={styles.waitRow}>
          <Text style={styles.waitText}>等待车主处理路线与报价</Text>
          <Text
            accessibilityRole="button"
            accessibilityLabel="撤回这份申请"
            onPress={onWithdraw}
            style={styles.withdrawText}
          >
            撤回
          </Text>
        </View>
      ) : application.status === 'accepted' ? (
        <View style={styles.waitRow}>
          <Text style={styles.waitText}>价格与 {application.people} 个座位已确认</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="查看已成交行程"
            onPress={() => router.push(`/ride/${ride.id}`)}
          >
            <Text style={styles.routeLink}>查看路线</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function OwnerTripCard({ ride, applications }: { ride: Ride; applications: Application[] }) {
  const pending = applications.filter(
    (application) => application.rideId === ride.id && application.status === 'pending',
  ).length;
  const remaining = getRemainingSeats(ride);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/owner/${ride.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardTitle}>{ride.destination}</Text>
          <Text style={styles.cardMeta}>{ride.dateLabel} · {ride.startTime} 出发</Text>
        </View>
        <View style={[styles.status, pending > 0 ? styles.statusPending : styles.statusOk]}>
          <Text style={[styles.statusText, pending > 0 ? styles.statusPendingText : styles.statusOkText]}>
            {pending > 0 ? `${pending} 待审核` : ride.status === 'full' ? '已满员' : '招募中'}
          </Text>
        </View>
      </View>
      <View style={styles.ownerStats}>
        <Stat label="剩余座位" value={`${remaining}`} />
        <Stat label="路线版本" value={`v${ride.routeVersion}`} />
        <Stat label="最低价" value={`¥${ride.minPrice}`} />
      </View>
      <View style={styles.manageRow}>
        <Text style={styles.manageText}>{pending > 0 ? '有新的申请需要你处理' : '管理路线和同行成员'}</Text>
        <AppIcon name="forward" size={15} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({
  title,
  text,
  action,
  onPress,
}: {
  title: string;
  text: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <Pressable onPress={onPress} style={styles.emptyAction}>
        <Text style={styles.emptyActionText}>{action}</Text>
      </Pressable>
    </View>
  );
}

function applicationStatus(application: Application) {
  if (application.status === 'accepted') {
    return { label: '已成交', style: styles.statusOk, textStyle: styles.statusOkText };
  }
  if (application.status === 'countered') {
    return { label: '待回应', style: styles.statusWarn, textStyle: styles.statusWarnText };
  }
  if (application.status === 'rejected') {
    return { label: '已拒绝', style: styles.statusMuted, textStyle: styles.statusMutedText };
  }
  if (application.status === 'withdrawn') {
    return { label: '已撤回', style: styles.statusMuted, textStyle: styles.statusMutedText };
  }
  if (application.status === 'expired') {
    return { label: '已失效', style: styles.statusMuted, textStyle: styles.statusMutedText };
  }
  return { label: '待审核', style: styles.statusPending, textStyle: styles.statusPendingText };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
    marginTop: 4,
  },
  add: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.berry,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    marginTop: spacing.xxl,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: '#E9EFF3',
    flexDirection: 'row',
  },
  segmentItem: {
    flex: 1,
    minHeight: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.paper,
  },
  segmentText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: '#E5ECF0',
    ...shadow,
  },
  pressed: {
    opacity: 0.88,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 16,
    fontWeight: '800',
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    marginTop: 4,
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  statusText: {
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  statusPending: {
    backgroundColor: '#FFF2D4',
  },
  statusPendingText: {
    color: '#855A10',
  },
  statusWarn: {
    backgroundColor: colors.pink,
  },
  statusWarnText: {
    color: colors.pinkInk,
  },
  statusOk: {
    backgroundColor: colors.mint,
  },
  statusOkText: {
    color: colors.mintDark,
  },
  statusMuted: {
    backgroundColor: '#EDF1F3',
  },
  statusMutedText: {
    color: colors.muted,
  },
  appSummary: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  appCopy: {
    flex: 1,
  },
  appText: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 11,
    fontWeight: '700',
  },
  appMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 3,
  },
  appPrice: {
    color: colors.berry,
    fontFamily: type.number,
    fontSize: 18,
    fontWeight: '700',
  },
  appPriceUnit: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  counterBox: {
    marginTop: spacing.md,
    backgroundColor: '#FFF5F7',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  counterText: {
    color: colors.pinkInk,
    fontFamily: type.body,
    fontSize: 9,
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 39,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8DDE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  primaryAction: {
    flex: 1.2,
    minHeight: 39,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: colors.white,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  waitRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waitText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
  },
  withdrawText: {
    color: colors.danger,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  routeLink: {
    color: colors.blue,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  ownerStats: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: colors.ink,
    fontFamily: type.number,
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 2,
  },
  manageRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manageText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
  },
  empty: {
    borderRadius: radius.xl,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xxl,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
  emptyAction: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    minHeight: 38,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  emptyActionText: {
    color: colors.white,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
});
