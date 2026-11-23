import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type IconName } from '@/components/AppIcon';
import { PageHeader } from '@/components/PageHeader';
import { tapFeedback } from '@/lib/haptics';
import { useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, spacing, type } from '@/theme';
import type { AppNotification, NotificationType } from '@/types';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    applications,
    rides,
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();
  const visibleNotifications = notifications
    .filter((notification) => notification.userId === currentUser.id)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length;

  const openNotification = (notification: AppNotification) => {
    tapFeedback();
    markNotificationRead(notification.id);
    const ride = rides.find((item) => item.id === notification.rideId);
    const application = applications.find(
      (item) => item.id === notification.applicationId,
    );

    if (ride?.owner.id === currentUser.id) {
      router.push(`/owner/${ride.id}`);
      return;
    }
    if (
      notification.type === 'application_accepted' &&
      ride &&
      application?.applicant.id === currentUser.id
    ) {
      router.push(`/ride/${ride.id}`);
      return;
    }
    router.push('/trips');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#DDF1FA', '#F4F8FB', '#F4F8FB']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      <PageHeader
        title="消息中心"
        onBack={() => router.back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="全部标为已读"
            accessibilityState={{ disabled: unreadCount === 0 }}
            disabled={unreadCount === 0}
            hitSlop={8}
            onPress={() => {
              tapFeedback();
              markAllNotificationsRead();
            }}
          >
            <Text style={[styles.readAll, unreadCount === 0 && styles.readAllDisabled]}>
              全部已读
            </Text>
          </Pressable>
        }
      />

      <FlatList
        data={visibleNotifications}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl },
        ]}
        ListHeaderComponent={
          <View style={styles.heading}>
            <View>
              <Text style={styles.title}>行程动态</Text>
              <Text style={styles.subtitle}>申请、报价和路线变化，都从这里继续。</Text>
            </View>
            <View style={[styles.unreadPill, unreadCount === 0 && styles.unreadPillQuiet]}>
              <View style={[styles.unreadDot, unreadCount === 0 && styles.unreadDotQuiet]} />
              <Text style={[styles.unreadText, unreadCount === 0 && styles.unreadTextQuiet]}>
                {unreadCount > 0 ? `${unreadCount} 条未读` : '已全部读完'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyNotifications onPress={() => router.push('/search')} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => openNotification(item)} />
        )}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const visual = notificationVisual(notification.type);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${notification.read ? '已读' : '未读'}通知，${notification.title}。${notification.body}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.notification,
        !notification.read && styles.notificationUnread,
        pressed && styles.notificationPressed,
      ]}
    >
      <View style={[styles.typeIcon, { backgroundColor: visual.background }]}>
        <AppIcon name={visual.icon} size={20} color={visual.ink} />
      </View>
      <View style={styles.notificationCopy}>
        <View style={styles.notificationTop}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          {!notification.read ? <View style={styles.rowUnreadDot} /> : null}
        </View>
        <Text style={styles.notificationBody}>{notification.body}</Text>
        <View style={styles.notificationMeta}>
          <Text style={[styles.typeLabel, { color: visual.ink }]}>{visual.label}</Text>
          <Text style={styles.time}>{formatNotificationTime(notification.createdAt)}</Text>
        </View>
      </View>
      <AppIcon name="forward" size={15} color={colors.muted} />
    </Pressable>
  );
}

function EmptyNotifications({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppIcon name="message" size={26} color={colors.ink} />
      </View>
      <Text style={styles.emptyTitle}>还没有行程动态</Text>
      <Text style={styles.emptyText}>
        发出申请或发布拼车后，报价、审核和路线变化会出现在这里。
      </Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.emptyAction}>
        <Text style={styles.emptyActionText}>去找拼车</Text>
        <AppIcon name="forward" size={14} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function notificationVisual(type: NotificationType): {
  icon: IconName;
  label: string;
  background: string;
  ink: string;
} {
  if (type === 'application_received') {
    return {
      icon: 'car',
      label: '新的申请',
      background: colors.lime,
      ink: colors.limeInk,
    };
  }
  if (type === 'application_submitted') {
    return {
      icon: 'route',
      label: '申请进度',
      background: colors.blueSoft,
      ink: '#174F74',
    };
  }
  if (type === 'counter_offer') {
    return {
      icon: 'message',
      label: '车主回价',
      background: colors.lavender,
      ink: colors.lavenderInk,
    };
  }
  if (type === 'application_accepted') {
    return {
      icon: 'check',
      label: '已成交',
      background: colors.mint,
      ink: colors.mintDark,
    };
  }
  if (type === 'seat_full') {
    return {
      icon: 'seat',
      label: '座位状态',
      background: '#FFF0D2',
      ink: '#765514',
    };
  }
  if (type === 'application_rejected') {
    return {
      icon: 'close',
      label: '未成交',
      background: colors.pink,
      ink: colors.pinkInk,
    };
  }
  return {
    icon: 'back',
    label: '申请变化',
    background: '#E8EEF1',
    ink: colors.inkSoft,
  };
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const elapsed = Date.now() - date.getTime();
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return '刚刚';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} 分钟前`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} 小时前`;

  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  readAll: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
  readAllDisabled: {
    color: colors.muted,
    opacity: 0.58,
  },
  list: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  heading: {
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  subtitle: {
    maxWidth: 235,
    marginTop: 5,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
    lineHeight: 16,
  },
  unreadPill: {
    minHeight: 31,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,.8)',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadPillQuiet: {
    backgroundColor: 'rgba(255,255,255,.54)',
    borderColor: 'transparent',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.berry,
  },
  unreadDotQuiet: {
    backgroundColor: colors.lineStrong,
  },
  unreadText: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  unreadTextQuiet: {
    color: colors.muted,
    fontWeight: '600',
  },
  notification: {
    minHeight: 112,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(255,255,255,.6)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  notificationUnread: {
    backgroundColor: 'rgba(255,255,255,.96)',
  },
  notificationPressed: {
    backgroundColor: '#EEF6F9',
  },
  typeIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  notificationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  notificationTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '800',
  },
  rowUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lime,
    borderWidth: 1,
    borderColor: '#6F9816',
  },
  notificationBody: {
    marginTop: 5,
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 16,
  },
  notificationMeta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeLabel: {
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  time: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  separator: {
    height: 1,
    marginLeft: spacing.lg + 43 + spacing.md,
    backgroundColor: colors.line,
  },
  empty: {
    minHeight: 280,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,.84)',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: spacing.lg,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: spacing.sm,
    maxWidth: 280,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
    lineHeight: 17,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: spacing.xl,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyActionText: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
});
