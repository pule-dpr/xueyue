import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/AppIcon';
import { BrandLogo } from '@/components/BrandLogo';
import { RideCard } from '@/components/RideCard';
import { useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, shadow, spacing, type } from '@/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { rides, applications, notifications, currentUser } = useApp();
  const publicRides = rides.filter(
    (ride) => ride.owner.id !== currentUser.id && ride.status === 'recruiting',
  );
  const pendingOwnerCount = applications.filter(
    (application) =>
      application.status === 'pending' &&
      rides.some((ride) => ride.id === application.rideId && ride.owner.id === currentUser.id),
  ).length;
  const counterCount = applications.filter(
    (application) =>
      application.applicant.id === currentUser.id && application.status === 'countered',
  ).length;
  const unreadCount = notifications.filter(
    (notification) => notification.userId === currentUser.id && !notification.read,
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={['#C9E9F9', '#F4F8FB', '#FFF4F6']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 102 }]}
      >
        <View style={styles.topbar}>
          <BrandLogo size={36} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`消息通知${unreadCount > 0 ? `，${unreadCount} 条未读` : ''}`}
            onPress={() => router.push('/notifications')}
            style={styles.message}
          >
            <AppIcon name="message" size={14} color={colors.inkSoft} />
            <Text style={styles.messageText}>消息</Text>
            {unreadCount > 0 ? (
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>周六 12月5日 · 长春出发</Text>
          <Text style={styles.headline}>找拼车</Text>
          <Text style={styles.subline}>输入雪场，看看谁正好顺路。</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="搜索拼车"
          onPress={() => router.push('/search')}
          style={({ pressed }) => [styles.searchCard, pressed && styles.pressed]}
        >
          <View style={styles.searchFields}>
            <View style={styles.searchLine}>
              <View style={styles.originDot} />
              <Text style={styles.searchText}>长春 · 净月</Text>
              <Text style={styles.searchHint}>我的位置</Text>
            </View>
            <View style={styles.searchRule} />
            <View style={styles.searchLine}>
              <View style={[styles.originDot, styles.endDot]} />
              <Text style={styles.searchText}>松花湖雪场</Text>
              <Text style={styles.searchHint}>12月5日</Text>
            </View>
          </View>
          <View style={styles.searchButton}>
            <AppIcon name="search" size={16} color={colors.white} />
            <Text style={styles.searchButtonText}>查找空位</Text>
          </View>
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>附近顺路</Text>
          <Text style={styles.sectionMeta}>{publicRides.length} 个行程</Text>
        </View>
        <View style={styles.rides}>
          {publicRides.slice(0, 2).map((ride) => (
            <RideCard key={ride.id} ride={ride} />
          ))}
        </View>

        {pendingOwnerCount + counterCount > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>我的待办</Text>
              <Text style={styles.sectionMeta}>需要你处理</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/trips')}
              style={({ pressed }) => [styles.todoCard, pressed && styles.pressed]}
            >
              <View style={styles.todoIcon}>
                <AppIcon name="message" size={20} color={colors.ink} />
              </View>
              <View style={styles.todoCopy}>
                <Text style={styles.todoTitle}>你有新的拼车事项</Text>
                <Text style={styles.todoText}>
                  {pendingOwnerCount > 0 ? `${pendingOwnerCount} 个申请等待审核` : '车主已回价，等你确认'}
                  {counterCount > 0 ? ` · ${counterCount} 个回价等你答复` : ''}
                </Text>
              </View>
              <AppIcon name="forward" size={16} color={colors.muted} />
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
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
  },
  topbar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  message: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,.1)',
    backgroundColor: 'rgba(255,255,255,.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '600',
  },
  messageBadge: {
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBadgeText: {
    color: colors.limeInk,
    fontFamily: type.number,
    fontSize: 8,
    fontWeight: '800',
  },
  intro: {
    marginTop: spacing.xxl,
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '600',
  },
  headline: {
    marginTop: 5,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  subline: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 11,
  },
  searchCard: {
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,.92)',
    padding: spacing.lg,
    ...shadow,
  },
  searchFields: {
    gap: 2,
  },
  searchLine: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.inkSoft,
  },
  endDot: {
    borderColor: colors.berry,
    backgroundColor: colors.berry,
  },
  searchText: {
    flex: 1,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '700',
  },
  searchHint: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
  },
  searchRule: {
    height: 1,
    backgroundColor: colors.line,
    marginLeft: spacing.lg,
  },
  searchButton: {
    minHeight: 45,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  searchButtonText: {
    color: colors.white,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHead: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
  },
  rides: {
    gap: spacing.md,
  },
  todoCard: {
    minHeight: 76,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,.7)',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  todoIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoCopy: {
    flex: 1,
  },
  todoTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '700',
  },
  todoText: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
  },
  pressed: {
    opacity: 0.86,
  },
});
