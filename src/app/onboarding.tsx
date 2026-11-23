import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/AppIcon';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import {
  ApiError,
  remoteApiConfigured,
  requestLoginCode,
  updateRemoteProfile,
  verifyLoginCode,
} from '@/services/api';
import { useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, spacing, type } from '@/theme';

const DEMO_CODE = '246810';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { account, completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [name, setName] = useState(account.name === '小满' ? '' : account.name);
  const [phone, setPhone] = useState(account.phone);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [deliveryCode, setDeliveryCode] = useState(DEMO_CODE);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const continueFromIntro = () => {
    if (!privacyAccepted) {
      Alert.alert('先确认隐私说明', '雪约需要你了解本机数据保存方式后才能继续。');
      return;
    }
    tapFeedback();
    setStep(1);
  };

  const continueFromProfile = () => {
    if (!name.trim()) {
      Alert.alert('还差一个称呼', '请输入同行成员会看到的昵称。');
      return;
    }
    tapFeedback();
    setStep(2);
  };

  const requestCode = async () => {
    if (!isValidPhone(phone)) {
      Alert.alert('检查手机号', '请输入 11 位中国大陆手机号。');
      return;
    }
    tapFeedback();
    if (!remoteApiConfigured) return;
    setRequestingCode(true);
    try {
      const challenge = await requestLoginCode(phone);
      setChallengeId(challenge.challengeId);
      setDeliveryCode(challenge.devCode ?? '');
      setCodeSent(true);
    } catch (error) {
      Alert.alert(
        '没有获取验证码',
        error instanceof ApiError ? error.message : '暂时无法连接认证服务，请稍后再试。',
      );
    } finally {
      setRequestingCode(false);
    }
  };

  const finish = async () => {
    if (!isValidPhone(phone)) {
      Alert.alert('检查手机号', '请输入 11 位中国大陆手机号。');
      return;
    }
    if (remoteApiConfigured) {
      if (!codeSent || !challengeId) {
        Alert.alert('先获取验证码', '获取验证码后再完成资料设置。');
        return;
      }
    }
    setVerifying(remoteApiConfigured);
    try {
      if (remoteApiConfigured) {
        const session = await verifyLoginCode({
          phone,
          challengeId: challengeId ?? '',
          code,
        });
        await updateRemoteProfile(session.token, { name: name.trim() });
      }
      completeOnboarding({ name, phone });
      successFeedback();
      router.replace('/');
    } catch (error) {
      Alert.alert(
        '验证码验证失败',
        error instanceof ApiError ? error.message : '暂时无法连接认证服务，请稍后再试。',
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#CFEAF8', '#F4F8FB', '#F8FBF8']}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl },
          ]}
        >
          <View style={styles.topbar}>
            <BrandLogo size={38} />
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>资料设置 · {step + 1}/3</Text>
            </View>
          </View>

          {step === 0 ? (
            <IntroStep
              accepted={privacyAccepted}
              onToggle={() => {
                tapFeedback();
                setPrivacyAccepted((value) => !value);
              }}
              onContinue={continueFromIntro}
            />
          ) : null}

          {step === 1 ? (
            <ProfileStep
              name={name}
              onChangeName={setName}
              onBack={() => setStep(0)}
              onContinue={continueFromProfile}
            />
          ) : null}

          {step === 2 ? (
            <PhoneStep
              phone={phone}
              code={code}
              codeSent={codeSent}
              deliveryCode={deliveryCode}
              remoteMode={remoteApiConfigured}
              requestingCode={requestingCode}
              verifying={verifying}
              onChangePhone={(value) => {
                setPhone(value);
                setCodeSent(false);
                setChallengeId(null);
                setCode('');
              }}
              onChangeCode={setCode}
              onRequestCode={requestCode}
              onBack={() => setStep(1)}
              onFinish={finish}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IntroStep({
  accepted,
  onToggle,
  onContinue,
}: {
  accepted: boolean;
  onToggle: () => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.title}>把空座，{'\n'}留给顺路的人。</Text>
      <Text style={styles.intro}>
        雪场远，约车信息散。雪约把路线、人数、雪具和报价放在一次申请里。
      </Text>

      <View style={styles.routeBoard}>
        <View style={styles.routeRail} />
        <RoutePoint
          title="长春 · 世纪广场"
          detail="07:00 出发"
          tone="origin"
        />
        <RoutePoint
          title="生态大街 · 顺路接人"
          detail="路线更新至第 2 版"
          tone="pickup"
        />
        <RoutePoint
          title="松花湖雪场"
          detail="预计 08:55 到达"
          tone="destination"
        />
        <View style={styles.readyTag}>
          <Text style={styles.readyTagText}>路线清楚再确认</Text>
        </View>
      </View>

      <View style={styles.principles}>
        <Principle icon="route" title="先看路线" text="接人点加入后，绕行时间直接展示。" />
        <Principle icon="seat" title="再谈价格" text="按人报价，双方确认后线下结算。" />
        <Principle icon="shield" title="未成交不锁座" text="车主的座位和路线不会被提前占用。" />
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel="同意昵称、手机号和车辆资料仅保存在本机，并了解地图搜索可能发送关键词"
        onPress={onToggle}
        style={styles.privacyRow}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted ? <AppIcon name="check" size={13} color={colors.ink} strokeWidth={2.4} /> : null}
        </View>
        <Text style={styles.privacyCopy}>
          我已了解：昵称、手机号和车辆资料保存在本机；地点搜索可能将关键词发送给地图服务。
        </Text>
      </Pressable>

      <Button label="开始设置" onPress={onContinue} icon="forward" />
    </View>
  );
}

function ProfileStep({
  name,
  onChangeName,
  onBack,
  onContinue,
}: {
  name: string;
  onChangeName: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.stepBody}>
      <BackButton onPress={onBack} />
      <Text style={styles.title}>同行的人，{'\n'}该怎么称呼你？</Text>
      <Text style={styles.intro}>昵称会出现在申请、审核和已确认同行信息中。</Text>

      <View style={styles.formPanel}>
        <Text style={styles.fieldLabel}>显示昵称</Text>
        <TextInput
          accessibilityLabel="显示昵称"
          value={name}
          onChangeText={onChangeName}
          placeholder="例如：小满"
          placeholderTextColor="#8B98A1"
          maxLength={12}
          autoCapitalize="none"
          style={styles.input}
        />
        <Text style={styles.fieldHint}>建议使用滑雪朋友容易识别的称呼，不需要填写真实姓名。</Text>
      </View>

      <View style={styles.noteBand}>
        <AppIcon name="shield" size={18} color={colors.mintDark} />
        <Text style={styles.noteBandText}>你的昵称只对与你发生申请或同行关系的人展示。</Text>
      </View>

      <Button label="继续" onPress={onContinue} icon="forward" />
    </View>
  );
}

function PhoneStep({
  phone,
  code,
  codeSent,
  deliveryCode,
  remoteMode,
  requestingCode,
  verifying,
  onChangePhone,
  onChangeCode,
  onRequestCode,
  onBack,
  onFinish,
}: {
  phone: string;
  code: string;
  codeSent: boolean;
  deliveryCode: string;
  remoteMode: boolean;
  requestingCode: boolean;
  verifying: boolean;
  onChangePhone: (value: string) => void;
  onChangeCode: (value: string) => void;
  onRequestCode: () => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <View style={styles.stepBody}>
      <BackButton onPress={onBack} />
      <Text style={styles.title}>留下联系方式，{'\n'}让同行更放心。</Text>
      <Text style={styles.intro}>
        {remoteMode
          ? '当前连接开发认证服务：验证码由服务端生成，不会真实发送短信。'
          : '当前版本不发送短信。手机号只会保存在本机，不会显示为已认证。'}
      </Text>

      <View style={styles.formPanel}>
        <Text style={styles.fieldLabel}>手机号</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+86</Text>
          </View>
          <TextInput
            accessibilityLabel="手机号"
            value={phone}
            onChangeText={(value) => onChangePhone(value.replace(/\D/g, ''))}
            placeholder="请输入 11 位手机号"
            placeholderTextColor="#8B98A1"
            keyboardType="phone-pad"
            maxLength={11}
            style={[styles.input, styles.phoneInput]}
          />
        </View>

        {remoteMode ? (
          <>
            <View style={styles.codeHeading}>
              <Text style={styles.fieldLabel}>验证码</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: requestingCode }}
                disabled={requestingCode}
                onPress={onRequestCode}
                hitSlop={8}
              >
                <Text style={[styles.codeAction, requestingCode && styles.codeActionDisabled]}>
                  {requestingCode ? '正在获取' : codeSent ? '重新获取' : '获取验证码'}
                </Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="验证码"
              value={code}
              onChangeText={(value) => onChangeCode(value.replace(/\D/g, ''))}
              placeholder="6 位数字"
              placeholderTextColor="#8B98A1"
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.codeInput]}
            />
            {codeSent ? (
              <View style={styles.demoCode}>
                <View style={styles.demoDot} />
                <Text style={styles.demoCodeText}>
                  {deliveryCode ? '开发环境验证码：' : '验证码已通过短信服务生成。'}
                  {deliveryCode ? (
                    <Text style={styles.demoCodeNumber}>{deliveryCode}</Text>
                  ) : null}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.dataNotice}>
        <View style={styles.dataNoticeIcon}>
          <AppIcon name="shield" size={18} color={colors.ink} />
        </View>
        <View style={styles.dataNoticeCopy}>
          <Text style={styles.dataNoticeTitle}>资料目前只保存在本机</Text>
          <Text style={styles.dataNoticeText}>
            {remoteMode
              ? '接入服务端后，会在这里说明保存期限、删除方式和认证主体。'
              : '正式短信认证与云端同步尚未启用，雪约不会把手机号显示为已验证。'}
          </Text>
        </View>
      </View>

      <Button label="进入雪约" onPress={onFinish} icon="check" loading={verifying} />
    </View>
  );
}

function RoutePoint({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: 'origin' | 'pickup' | 'destination';
}) {
  return (
    <View style={styles.routePoint}>
      <View
        style={[
          styles.routeNode,
          tone === 'origin' && styles.routeNodeOrigin,
          tone === 'pickup' && styles.routeNodePickup,
          tone === 'destination' && styles.routeNodeDestination,
        ]}
      />
      <View style={styles.routeCopy}>
        <Text style={styles.routeTitle}>{title}</Text>
        <Text style={styles.routeDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function Principle({
  icon,
  title,
  text,
}: {
  icon: 'route' | 'seat' | 'shield';
  title: string;
  text: string;
}) {
  return (
    <View style={styles.principle}>
      <View style={styles.principleIcon}>
        <AppIcon name={icon} size={17} color={colors.ink} />
      </View>
      <View style={styles.principleCopy}>
        <Text style={styles.principleTitle}>{title}</Text>
        <Text style={styles.principleText}>{text}</Text>
      </View>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="返回上一步"
      onPress={onPress}
      hitSlop={8}
      style={styles.back}
    >
      <AppIcon name="back" size={18} color={colors.ink} />
      <Text style={styles.backText}>上一步</Text>
    </Pressable>
  );
}

function isValidPhone(value: string) {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  topbar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,.66)',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,.08)',
  },
  stepPillText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '600',
  },
  stepBody: {
    marginTop: spacing.xxl,
  },
  title: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  intro: {
    marginTop: spacing.md,
    maxWidth: 340,
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 19,
  },
  routeBoard: {
    position: 'relative',
    marginTop: spacing.xxl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,.91)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.96)',
    padding: spacing.lg,
    gap: 15,
  },
  routeRail: {
    position: 'absolute',
    left: 25,
    top: 32,
    bottom: 32,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.line,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  routeNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: colors.paper,
    zIndex: 1,
  },
  routeNodeOrigin: {
    backgroundColor: colors.ink,
  },
  routeNodePickup: {
    backgroundColor: colors.lavender,
    borderColor: '#F5F2FF',
  },
  routeNodeDestination: {
    backgroundColor: colors.berry,
  },
  routeCopy: {
    flex: 1,
  },
  routeTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 11,
    fontWeight: '700',
  },
  routeDetail: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  readyTag: {
    alignSelf: 'flex-start',
    marginLeft: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readyTagText: {
    color: colors.limeInk,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  principles: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  principle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  principleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  principleCopy: {
    flex: 1,
  },
  principleTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
  principleText: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
  },
  privacyRow: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(255,255,255,.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.lime,
    borderColor: '#89B222',
  },
  privacyCopy: {
    flex: 1,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
  },
  back: {
    alignSelf: 'flex-start',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xl,
  },
  backText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '600',
  },
  formPanel: {
    marginTop: spacing.xxl,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.96)',
    padding: spacing.lg,
  },
  fieldLabel: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.snow,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 13,
  },
  fieldHint: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
  },
  noteBand: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteBandText: {
    flex: 1,
    color: colors.mintDark,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countryCode: {
    width: 62,
    minHeight: 50,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.snow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    color: colors.ink,
    fontFamily: type.number,
    fontSize: 12,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
  },
  codeHeading: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeAction: {
    color: colors.blue,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  codeActionDisabled: {
    opacity: 0.48,
  },
  codeInput: {
    letterSpacing: 5,
    fontFamily: type.number,
    fontSize: 16,
  },
  demoCode: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.berry,
  },
  demoCodeText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  demoCodeNumber: {
    color: colors.berry,
    fontFamily: type.number,
    fontWeight: '700',
    letterSpacing: 1,
  },
  dataNotice: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: '#E8F1F4',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dataNoticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataNoticeCopy: {
    flex: 1,
  },
  dataNoticeTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  dataNoticeText: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
  },
});
