import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/AppIcon';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { successFeedback } from '@/lib/haptics';
import { useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, spacing, type } from '@/theme';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { account, currentUser, updateAccount } = useApp();
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(account.phone);
  const [vehicleModel, setVehicleModel] = useState(account.vehicleModel);
  const [vehicleColor, setVehicleColor] = useState(account.vehicleColor);
  const [plateNumber, setPlateNumber] = useState(account.plateNumber);

  const save = () => {
    if (!name.trim()) {
      Alert.alert('检查昵称', '昵称不能为空。');
      return;
    }
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      Alert.alert('检查手机号', '请输入 11 位中国大陆手机号，或暂时留空。');
      return;
    }

    updateAccount({
      name: name.trim(),
      phone: phone.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleColor: vehicleColor.trim(),
      plateNumber: plateNumber.trim().toUpperCase(),
    });
    successFeedback();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PageHeader
          title="账号与车辆"
          onBack={() => router.back()}
          right={<Text style={styles.localTag}>仅本机</Text>}
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl },
          ]}
        >
          <Text style={styles.title}>把同行信息补完整。</Text>
          <Text style={styles.intro}>
            昵称会展示给与你发生申请或同行关系的人。车辆资料为选填，方便已确认成员核对车辆。
          </Text>

          <View style={styles.statusBand}>
            <View style={styles.statusIcon}>
              <AppIcon name="profile" size={20} color={colors.ink} />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>本机资料已启用</Text>
              <Text style={styles.statusText}>短信认证与云端同步将在服务端接入后开放。</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>未认证</Text>
            </View>
          </View>

          <Section title="用户资料">
            <Field
              label="显示昵称"
              value={name}
              onChangeText={setName}
              placeholder="例如：小满"
              maxLength={12}
            />
            <Field
              label="手机号"
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, ''))}
              placeholder="11 位手机号"
              keyboardType="phone-pad"
              maxLength={11}
              hint="当前只保存在本机，不会发送验证码。"
            />
          </Section>

          <Section title="常用车辆 · 选填">
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Field
                  label="车型"
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  placeholder="例如：Model Y"
                  maxLength={24}
                />
              </View>
              <View style={styles.column}>
                <Field
                  label="颜色"
                  value={vehicleColor}
                  onChangeText={setVehicleColor}
                  placeholder="例如：白色"
                  maxLength={12}
                />
              </View>
            </View>
            <Field
              label="车牌号"
              value={plateNumber}
              onChangeText={setPlateNumber}
              placeholder="选填，仅本机保存"
              maxLength={8}
              autoCapitalize="characters"
              hint="只有已确认同行成员需要核对车辆时，才由你决定是否分享。"
            />
          </Section>

          <View style={styles.privacy}>
            <AppIcon name="shield" size={20} color={colors.mintDark} />
            <Text style={styles.privacyText}>
              当前版本不上传昵称、手机号、车牌和行程。卸载 App 或清除数据后，本机资料无法恢复。
            </Text>
          </View>

          <Button label="保存资料" onPress={save} icon="check" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  hint,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8B98A1"
        style={styles.input}
        {...inputProps}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  localTag: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1,
  },
  intro: {
    marginTop: spacing.sm,
    maxWidth: 360,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 16,
  },
  statusBand: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: '#E8F1F4',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
  statusText: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
  },
  statusBadge: {
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusBadgeText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '800',
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: 6,
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
  },
  hint: {
    marginTop: 5,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 13,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
  },
  privacy: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  privacyText: {
    flex: 1,
    color: colors.mintDark,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
  },
});
