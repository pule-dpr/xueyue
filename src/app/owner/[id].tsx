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
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { RouteMap } from '@/components/RouteMap';
import { confirmAction } from '@/lib/confirm';
import { successFeedback } from '@/lib/haptics';
import { getRemainingSeats, useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, spacing, type } from '@/theme';
import type { Application } from '@/types';

export default function OwnerTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    rides,
    applications,
    acceptApplication,
    rejectApplication,
    counterApplication,
  } = useApp();
  const ride = rides.find((item) => item.id === id);
  const [counteringId, setCounteringId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState('');

  if (!ride) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <Text style={styles.emptyTitle}>这段拼车已经不在。</Text>
          <Button label="回到行程" onPress={() => router.replace('/trips')} />
        </View>
      </SafeAreaView>
    );
  }

  const pending = applications.filter(
    (application) =>
      application.rideId === ride.id && application.status === 'pending',
  );

  const accept = (application: Application) => {
    const result = acceptApplication(application.id);
    if (!result.ok) {
      Alert.alert('无法同意申请', result.message);
      return;
    }
    successFeedback();
    Alert.alert('已确认同行', '座位与价格已锁定，路线已生成新版本。');
  };

  const reject = (application: Application) =>
    confirmAction({
      title: '拒绝这份申请？',
      message: '路线和剩余座位不会发生变化。',
      confirmLabel: '拒绝申请',
      onConfirm: () => rejectApplication(application.id),
    });

  const submitCounter = (application: Application) => {
    const price = Number(counterPrice);
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('检查回价', '请输入有效的每人回价。');
      return;
    }
    counterApplication(application.id, price);
    setCounteringId(null);
    setCounterPrice('');
    successFeedback();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PageHeader
          title="行程管理"
          onBack={() => router.back()}
          right={<Text style={styles.headerCount}>{pending.length} 待处理</Text>}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg },
          ]}
        >
          <View style={styles.heading}>
            <View>
              <Text style={styles.title}>{ride.destination.replace('雪场', '')}</Text>
              <Text style={styles.subtitle}>{ride.dateLabel} · {ride.startTime} 出发 · 路线 v{ride.routeVersion}</Text>
            </View>
            <Text style={styles.seats}>余 {getRemainingSeats(ride)} 座</Text>
          </View>

          {pending.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <AppIcon name="route" size={24} color={colors.ink} />
              </View>
              <Text style={styles.emptyTitle}>暂时没有待处理申请</Text>
              <Text style={styles.emptyText}>有人申请加入后，这里会显示人数、报价和路线影响。</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/ride/${ride.id}`)}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>查看乘客视角</Text>
              </Pressable>
            </View>
          ) : (
            pending.map((application) => (
              <View key={application.id} style={styles.reviewCard}>
                <View style={styles.applicant}>
                  <Avatar user={application.applicant} size={38} />
                  <View style={styles.applicantCopy}>
                    <Text style={styles.applicantName}>
                      {application.applicant.name} · {application.people} 人
                    </Text>
                    <Text style={styles.applicantMeta}>
                      手机号已认证 · {application.gearCount} 副雪具 · {application.pickup}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>待审核</Text>
                  </View>
                </View>

                <View style={styles.compare}>
                  <RouteMap
                    compare
                    labels={false}
                    available={ride.hasRouteSample}
                  />
                  <View style={styles.legend}>
                    <Text style={styles.legendItem}>━ 当前路线</Text>
                    <Text style={styles.legendItem}>┄ 加入后</Text>
                  </View>
                </View>

                <View style={styles.metrics}>
                  <Metric label="新路线" value={`${application.newDistanceKm} km`} />
                  <Metric label="多花时间" value={`+${application.addedMinutes} 分`} accent />
                  <Metric label="总时长" value={`${application.newDurationMin} 分`} />
                </View>

                <View style={styles.quote}>
                  <View>
                    <Text style={styles.quoteLabel}>乘客报价 · {application.people} 人</Text>
                    <Text style={styles.quoteValue}>¥{application.offerPerPerson} / 人</Text>
                  </View>
                  <Text style={styles.quoteTotal}>
                    合计 ¥{application.offerPerPerson * application.people}
                  </Text>
                </View>

                {counteringId === application.id ? (
                  <View style={styles.counterForm}>
                    <Text style={styles.counterLabel}>你的回价（每人）</Text>
                    <View style={styles.counterInputRow}>
                      <View style={styles.counterInputWrap}>
                        <Text style={styles.currency}>¥</Text>
                        <TextInput
                          accessibilityLabel="每人回价"
                          value={counterPrice}
                          onChangeText={setCounterPrice}
                          keyboardType="number-pad"
                          placeholder={String(application.offerPerPerson)}
                          placeholderTextColor={colors.muted}
                          style={styles.counterInput}
                          autoFocus
                        />
                      </View>
                      <Button label="发出回价" onPress={() => submitCounter(application)} compact />
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <View style={styles.action}>
                      <Button label="拒绝" variant="secondary" compact onPress={() => reject(application)} />
                    </View>
                    <View style={styles.action}>
                      <Button
                        label="回价"
                        variant="soft"
                        compact
                        onPress={() => {
                          setCounteringId(application.id);
                          setCounterPrice(String(application.offerPerPerson));
                        }}
                      />
                    </View>
                    <View style={styles.actionWide}>
                      <Button
                        label={`同意 ¥${application.offerPerPerson * application.people}`}
                        compact
                        onPress={() => accept(application)}
                      />
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accent && styles.metricAccent]}>{value}</Text>
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
  headerCount: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    marginTop: 4,
  },
  seats: {
    color: colors.berry,
    backgroundColor: colors.pink,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
  },
  reviewCard: {
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  applicant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  applicantCopy: {
    flex: 1,
  },
  applicantName: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '700',
  },
  applicantMeta: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
    marginTop: 3,
  },
  badge: {
    borderRadius: radius.sm,
    backgroundColor: '#FFF1D2',
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#855A10',
    fontFamily: type.body,
    fontSize: 8,
    fontWeight: '700',
  },
  compare: {
    height: 185,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  legend: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,.93)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 7,
  },
  metrics: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minHeight: 53,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 7,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: type.number,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  metricAccent: {
    color: colors.pinkInk,
  },
  quote: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFF3F6',
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteLabel: {
    color: '#82656E',
    fontFamily: type.body,
    fontSize: 8,
  },
  quoteValue: {
    color: colors.pinkInk,
    fontFamily: type.number,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  quoteTotal: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 0.85,
  },
  actionWide: {
    flex: 1.25,
  },
  counterForm: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F7F3FF',
    padding: spacing.md,
  },
  counterLabel: {
    color: colors.lavenderInk,
    fontFamily: type.body,
    fontSize: 8,
    marginBottom: spacing.sm,
  },
  counterInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  counterInputWrap: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  currency: {
    color: colors.berry,
    fontFamily: type.body,
    fontSize: 14,
    fontWeight: '700',
  },
  counterInput: {
    flex: 1,
    color: colors.ink,
    fontFamily: type.number,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
  },
  empty: {
    marginTop: spacing.xxl,
    borderRadius: radius.xl,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xxl,
    alignItems: 'flex-start',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  emptyButton: {
    marginTop: spacing.lg,
    minHeight: 39,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: colors.white,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  notFound: {
    flex: 1,
    padding: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
});
