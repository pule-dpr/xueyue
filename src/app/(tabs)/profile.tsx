import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/AppIcon';
import { Avatar } from '@/components/Avatar';
import { BrandLogo } from '@/components/BrandLogo';
import { confirmAction } from '@/lib/confirm';
import { tapFeedback } from '@/lib/haptics';
import { remoteApiConfigured } from '@/services/api';
import { useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, spacing, type } from '@/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { account, currentUser, rides, applications, resetDemo } = useApp();
  const owned = rides.filter((ride) => ride.owner.id === currentUser.id).length;
  const joined = applications.filter(
    (application) =>
      application.applicant.id === currentUser.id && application.status === 'accepted',
  ).length;

  const shareApp = async () => {
    await Share.share({
      message: '雪约：滑雪人群的顺路拼车与同行协调工具。把去哪儿、几点和空座说清楚。',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 108 }]}
      >
        <View style={styles.topbar}>
          <BrandLogo size={34} />
          <Text style={styles.verified}>{account.phone ? '本机资料' : '资料待完善'}</Text>
        </View>

        <View style={styles.profile}>
          <Avatar user={currentUser} size={70} />
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{currentUser.name}</Text>
            <Text style={styles.profileMeta}>
              {account.vehicleModel || '车辆资料未填写'} · {currentUser.ridesTogether} 次同行
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={owned} label="我发起的" />
          <View style={styles.rule} />
          <Stat value={joined} label="已成交" />
          <View style={styles.rule} />
          <Stat value={currentUser.ridesTogether} label="累计同行" />
        </View>

        <View style={styles.trustCard}>
          <View style={styles.trustIcon}>
            <AppIcon name="shield" size={24} color={colors.ink} />
          </View>
          <View style={styles.trustCopy}>
            <Text style={styles.trustTitle}>先看路线，再确认价格</Text>
            <Text style={styles.trustText}>
              雪约不替双方承运，不提供支付或担保。价格仅作为线下费用协商记录。
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>账号与安全</Text>
        <View style={styles.settings}>
          <Setting
            title="账号与车辆"
            detail={`${maskPhone(account.phone)} · ${account.vehicleModel || '车辆待填写'}`}
            icon="profile"
            onPress={() => router.push('/account')}
          />
          <Setting title="手机号认证" detail="本机保存 · 短信服务待接入" icon="profile" onPress={() => Alert.alert('手机号认证', '当前手机号只保存在本机，不会发送短信。接入正式认证服务后，会启用验证码、换号验证和账号找回。')} />
          <Setting title="安全中心" detail="同行规则与紧急联系人" icon="shield" onPress={() => Alert.alert('安全中心', '出发前确认车辆、集合点与同行成员信息。雪场开放与道路情况以官方公告为准。')} />
          <Setting title="隐私与本地数据" detail="雪约保存在当前设备" icon="car" onPress={() => Alert.alert('隐私与本地数据', '当前版本不向开发者服务器上传你的行程。卸载 App 或清除数据后，本地记录无法恢复。')} />
          <Setting title="邀请朋友" detail="分享雪约" icon="message" onPress={shareApp} />
        </View>

        <Text style={styles.sectionTitle}>开发与数据</Text>
        <View style={styles.settings}>
          <Setting
            title="服务端连接"
            detail={remoteApiConfigured ? 'API 已配置 · 数据仍在本地' : '本地模式 · 未配置 API'}
            icon="route"
            onPress={() =>
              Alert.alert(
                '服务端连接',
                remoteApiConfigured
                  ? '认证接口已经配置。当前版本仍以本机数据为准，下一步会把行程和申请迁移到服务端同步。'
                  : '设置 EXPO_PUBLIC_API_URL 后，首次启动会请求雪约服务端验证码。未配置时保持完全本地演示。',
              )
            }
          />
          <Setting
            title="重置演示数据"
            detail="恢复示例行程和申请"
            icon="route"
            onPress={() =>
              confirmAction({
                title: '重置演示数据？',
                message: '当前本地创建的行程和申请会被示例数据替换。',
                confirmLabel: '重置',
                onConfirm: resetDemo,
              })
            }
          />
          <Setting
            title="地图接入状态"
            detail="当前为真实地图样例 · 高德 Key 待配置"
            icon="pin"
            onPress={() =>
              Alert.alert(
                '地图接入',
                '界面使用真实道路样例完成设计验证。正式发布前需接入高德地图 SDK，并配置 Android Key、签名 SHA1 与隐私声明。',
              )
            }
          />
        </View>

        <Text style={styles.version}>
          雪约 {Constants.expoConfig?.version ?? '1.0.0'} · 本地 MVP · Android 构建 {Constants.expoConfig?.android?.versionCode ?? 1}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Setting({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail: string;
  icon: 'profile' | 'shield' | 'car' | 'message' | 'route' | 'pin';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.setting, pressed && styles.pressed]}
    >
      <View style={styles.settingIcon}>
        <AppIcon name={icon} size={18} color={colors.inkSoft} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <AppIcon name="forward" size={15} color={colors.muted} />
    </Pressable>
  );
}

function maskPhone(phone: string) {
  if (!phone) return '手机号待填写';
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)} **** ${phone.slice(-4)}`;
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
    minHeight: 50,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verified: {
    color: colors.mintDark,
    backgroundColor: colors.mint,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  profile: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  profileCopy: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  profileMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 16,
    marginTop: 4,
  },
  stats: {
    marginTop: spacing.xxl,
    minHeight: 86,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.ink,
    fontFamily: type.number,
    fontSize: 21,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 3,
  },
  rule: {
    width: 1,
    height: 31,
    backgroundColor: colors.line,
  },
  trustCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#E8F1F4',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trustIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustCopy: {
    flex: 1,
  },
  trustTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '700',
  },
  trustText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  settings: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  setting: {
    minHeight: 65,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.snow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 11,
    fontWeight: '700',
  },
  settingDetail: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 3,
  },
  pressed: {
    backgroundColor: '#F6F9FA',
  },
  version: {
    color: '#8C989F',
    fontFamily: type.body,
    fontSize: 8,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
