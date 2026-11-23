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
import { LocationPicker } from '@/components/LocationPicker';
import { dateOptions, defaultDestinations, defaultOrigins } from '@/data/trips';
import { successFeedback } from '@/lib/haptics';
import { useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, spacing, type } from '@/theme';

export default function PublishScreen() {
  const insets = useSafeAreaInsets();
  const { addRide } = useApp();
  const [origin, setOrigin] = useState(defaultOrigins[0]);
  const [destination, setDestination] = useState(defaultDestinations[0]);
  const [date, setDate] = useState(dateOptions[2]);
  const [startTime, setStartTime] = useState('07:00');
  const [minPrice, setMinPrice] = useState('50');
  const [seats, setSeats] = useState(3);
  const [gear, setGear] = useState(3);
  const [detour, setDetour] = useState(15);
  const [note, setNote] = useState('');

  const publish = () => {
    const price = Number(minPrice);
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert('检查最低价', '请输入不小于 0 的每人最低价格。');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      Alert.alert('检查出发时间', '请按 07:00 的格式填写出发时间。');
      return;
    }

    const ride = addRide({
      origin,
      destination,
      dateLabel: date,
      startTime,
      minPrice: price,
      seatsTotal: seats + 1,
      gearTotal: gear,
      maxDetourMinutes: detour,
      note,
    });
    successFeedback();
    if (Platform.OS === 'web') {
      router.replace(`/owner/${ride.id}`);
      return;
    }
    Alert.alert('拼车已发布', '现在可以在行程页查看并审核新的申请。', [
      {
        text: '查看行程',
        onPress: () => router.replace(`/owner/${ride.id}`),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        >
          <View style={styles.topbar}>
            <BrandLogo size={34} />
            <Text style={styles.topHint}>发布者：小满</Text>
          </View>
          <View style={styles.heading}>
            <Text style={styles.title}>发布拼车</Text>
            <Text style={styles.subtitle}>把路线、座位和最低报价说清楚，再等顺路的人申请。</Text>
          </View>

          <FormSection title="路线">
            <LocationPicker
              label="出发地"
              value={origin}
              options={defaultOrigins}
              onChange={setOrigin}
              placeholder="例如：桂林路、净月潭，或输入详细地址"
            />
            <LocationPicker
              label="目的地"
              value={destination}
              options={defaultDestinations}
              onChange={setDestination}
              placeholder="搜索雪场，或输入自定义雪场"
              dotStyle="destination"
            />
          </FormSection>

          <FormSection title="时间">
            <ChipList options={dateOptions} value={date} onChange={setDate} />
            <FieldLabel label="出发时间" />
            <TextInput
              accessibilityLabel="出发时间"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="07:00"
              placeholderTextColor="#8B98A1"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.input}
            />
          </FormSection>

          <FormSection title="座位与报价">
            <View style={styles.stepperGrid}>
              <Stepper
                label="余座"
                value={seats}
                min={1}
                max={6}
                onChange={setSeats}
                suffix="座"
              />
              <Stepper
                label="雪具位"
                value={gear}
                min={0}
                max={6}
                onChange={setGear}
                suffix="副"
              />
            </View>
            <FieldLabel label="每人最低价" />
            <View style={styles.priceInput}>
              <Text style={styles.currency}>¥</Text>
              <TextInput
                accessibilityLabel="每人最低价"
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.priceField}
              />
              <Text style={styles.perPerson}>/ 人 · 线下结算</Text>
            </View>
            <FieldLabel label="最多可绕行" />
            <View style={styles.inlineOptions}>
              {[10, 15, 30].map((value) => (
                <Pill
                  key={value}
                  label={`${value} 分钟`}
                  active={detour === value}
                  onPress={() => setDetour(value)}
                />
              ))}
            </View>
          </FormSection>

          <FormSection title="同行说明">
            <TextInput
              accessibilityLabel="同行说明"
              value={note}
              onChangeText={setNote}
              placeholder="比如：可带单板、不吸烟、在世纪广场集合。"
              placeholderTextColor="#8B98A1"
              multiline
              maxLength={140}
              textAlignVertical="top"
              style={[styles.input, styles.textarea]}
            />
            <Text style={styles.counter}>{note.length} / 140</Text>
          </FormSection>

          <View style={styles.notice}>
            <AppIcon name="shield" size={18} color={colors.inkSoft} />
            <Text style={styles.noticeText}>
              价格仅作为双方线下费用协商记录，平台不收款，也不提供承运担保。
            </Text>
          </View>
          <Button label="发布拼车" onPress={publish} icon="plus" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function ChipList({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <Pill
          key={option}
          label={option}
          active={value === option}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix: string;
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
  },
  topbar: {
    minHeight: 48,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topHint: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
  },
  heading: {
    marginTop: spacing.xxl,
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
    lineHeight: 17,
    marginTop: 5,
    maxWidth: 330,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,.72)',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  chipText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 13,
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
  priceInput: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  currency: {
    color: colors.berry,
    fontFamily: type.body,
    fontSize: 17,
    fontWeight: '700',
  },
  priceField: {
    minWidth: 65,
    color: colors.ink,
    fontFamily: type.number,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
  },
  perPerson: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
  },
  inlineOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  textarea: {
    minHeight: 105,
    paddingTop: spacing.md,
    lineHeight: 20,
  },
  counter: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    textAlign: 'right',
    marginTop: 4,
  },
  notice: {
    marginVertical: spacing.xxl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeText: {
    flex: 1,
    color: colors.mintDark,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 15,
  },
});
