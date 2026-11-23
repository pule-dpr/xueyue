import { router, useLocalSearchParams } from 'expo-router';
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
import { Button } from '@/components/Button';
import { LocationPicker } from '@/components/LocationPicker';
import { PageHeader } from '@/components/PageHeader';
import { pickupOptions } from '@/data/trips';
import { successFeedback } from '@/lib/haptics';
import { getRemainingGear, getRemainingSeats, useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, spacing, type } from '@/theme';

export default function ApplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { rides, submitApplication } = useApp();
  const ride = rides.find((item) => item.id === id);
  const [people, setPeople] = useState(1);
  const [gear, setGear] = useState(0);
  const [pickup, setPickup] = useState(pickupOptions[0]);
  const [offer, setOffer] = useState(String(ride?.suggestedPrice ?? 50));

  if (!ride) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <Text style={styles.emptyTitle}>这段拼车已经不在。</Text>
          <Button label="回到找拼车" onPress={() => router.replace('/search')} />
        </View>
      </SafeAreaView>
    );
  }

  const maxPeople = getRemainingSeats(ride);
  const maxGear = getRemainingGear(ride);
  const offerNumber = Number(offer);
  const total = Number.isFinite(offerNumber) ? offerNumber * people : 0;

  const submit = () => {
    if (offerNumber < 0 || !Number.isFinite(offerNumber)) {
      Alert.alert('检查报价', '请输入有效的单人报价。');
      return;
    }
    if (people > maxPeople || gear > maxGear) {
      Alert.alert('容量不足', '请减少人数或雪具数量。');
      return;
    }
    submitApplication({
      rideId: ride.id,
      people,
      gearCount: gear,
      pickup,
      offerPerPerson: offerNumber,
    });
    successFeedback();
    if (Platform.OS === 'web') {
      router.replace('/trips');
      return;
    }
    Alert.alert('申请已提交', '车主要先查看路线和报价。未成交前不会占用座位。', [
      {
        text: '查看申请状态',
        onPress: () => router.replace('/trips'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PageHeader
          title="申请加入"
          onBack={() => router.back()}
          right={
            <View style={styles.privacy}>
              <AppIcon name="shield" size={13} color={colors.inkSoft} />
              <Text style={styles.privacyText}>本机数据保护</Text>
            </View>
          }
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg },
          ]}
        >
          <Text style={styles.title}>申请加入</Text>
          <Text style={styles.intro}>信息只对本次车主展示，未同意前不占用座位。</Text>

          <View style={styles.tripCard}>
            <View>
              <Text style={styles.tripTitle}>去{ride.destination.replace('雪场', '')}</Text>
              <Text style={styles.tripMeta}>{ride.dateLabel} · {ride.startTime} · {ride.owner.name}的车</Text>
            </View>
            <Text style={styles.tripSeats}>余 {maxPeople} 座</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>人数与雪具</Text>
              <Text style={styles.labelHint}>最多 {maxPeople} 人 · {maxGear} 件雪具</Text>
            </View>
            <View style={styles.stepperGrid}>
              <Stepper
                label="乘车人数"
                value={people}
                min={1}
                max={Math.max(1, maxPeople)}
                suffix="人"
                onChange={setPeople}
              />
              <Stepper
                label="雪具"
                value={gear}
                min={0}
                max={maxGear}
                suffix="副"
                onChange={setGear}
              />
            </View>
          </View>

          <View style={styles.section}>
            <LocationPicker
              label="我的上车位置"
              value={pickup}
              options={pickupOptions}
              onChange={setPickup}
              placeholder="搜索上车点，或直接输入详细地址"
              dotStyle="pickup"
            />
            <Text style={styles.pickupHint}>加入路线预计增加 8 分钟，成交后才会公开精确位置。</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>费用报价</Text>
              <Text style={styles.labelHint}>按人报价，线下结算</Text>
            </View>
            <View style={styles.quoteBox}>
              <View style={styles.quoteInputRow}>
                <Text style={styles.quoteLabel}>我的单人报价</Text>
                <View style={styles.quoteInput}>
                  <Text style={styles.currency}>¥</Text>
                  <TextInput
                    accessibilityLabel="单人报价"
                    value={offer}
                    onChangeText={setOffer}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={styles.priceField}
                  />
                </View>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{people} 人合计</Text>
                <Text style={styles.total}>¥{Number.isFinite(total) ? total : 0}</Text>
              </View>
            </View>
            <View style={styles.policy}>
              <Text style={styles.policyText}>
                车主最低价 ¥{ride.minPrice} / 人。车主可同意、拒绝或回价，未成交不会占用座位。
              </Text>
            </View>
          </View>

          <Button label={`提交申请 · ¥${Number.isFinite(total) ? total : 0}`} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <View>
        <Text style={styles.stepLabel}>{label}</Text>
        <Text style={styles.stepValue}>{value} {suffix}</Text>
      </View>
      <View style={styles.stepButtons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`减少${label}`}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.stepButton, value <= min && styles.disabled]}
        >
          <Text style={styles.stepSymbol}>−</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`增加${label}`}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.stepButton, value >= max && styles.disabled]}
        >
          <Text style={styles.stepSymbol}>+</Text>
        </Pressable>
      </View>
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
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  title: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1,
  },
  intro: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 16,
    marginTop: 4,
  },
  tripCard: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.mint,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 16,
    fontWeight: '800',
  },
  tripMeta: {
    color: colors.mintDark,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 3,
  },
  tripSeats: {
    color: colors.berry,
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.xxl,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 11,
    fontWeight: '700',
  },
  labelHint: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  stepperGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepper: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  stepValue: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  stepButton: {
    width: 27,
    height: 27,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.snow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSymbol: {
    color: colors.ink,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.35,
  },
  pickupHint: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
    marginTop: 7,
  },
  quoteBox: {
    borderRadius: radius.lg,
    backgroundColor: '#FFF3F6',
    borderWidth: 1,
    borderColor: '#FFE4EA',
    padding: spacing.lg,
  },
  quoteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quoteLabel: {
    color: '#83656D',
    fontFamily: type.body,
    fontSize: 9,
  },
  quoteInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: {
    color: colors.berry,
    fontFamily: type.body,
    fontSize: 16,
    fontWeight: '700',
  },
  priceField: {
    minWidth: 65,
    paddingVertical: 0,
    paddingHorizontal: 4,
    color: colors.pinkInk,
    fontFamily: type.number,
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'right',
  },
  totalRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1D9DF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    color: '#75636A',
    fontFamily: type.body,
    fontSize: 9,
  },
  total: {
    color: colors.ink,
    fontFamily: type.number,
    fontSize: 18,
    fontWeight: '700',
  },
  policy: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#EDF1F4',
  },
  policyText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 23,
    fontWeight: '800',
  },
  notFound: {
    flex: 1,
    padding: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
});
