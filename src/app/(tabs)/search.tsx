import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/AppIcon';
import { BrandLogo } from '@/components/BrandLogo';
import { LocationPicker } from '@/components/LocationPicker';
import { RideCard } from '@/components/RideCard';
import { dateOptions, defaultDestinations, defaultOrigins } from '@/data/trips';
import { useApp } from '@/store/AppProvider';
import { colors, maxContentWidth, radius, spacing, type } from '@/theme';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { rides, currentUser } = useApp();
  const [origin, setOrigin] = useState(defaultOrigins[0]);
  const [destination, setDestination] = useState(defaultDestinations[0]);
  const [date, setDate] = useState(dateOptions[0]);

  const originOptions = Array.from(new Set([...defaultOrigins, ...rides.map((ride) => ride.origin)]));
  const destinationOptions = Array.from(
    new Set([...defaultDestinations, ...rides.map((ride) => ride.destination)]),
  );
  const destinationKey = destination
    .split(' · ')[0]
    .replace(/\s/g, '')
    .replace(/滑雪场|雪场/g, '');
  const originParts = origin.split(' · ');
  const cityKey = (
    originParts.find((part) => part.endsWith('市') || part.endsWith('州')) ??
    originParts[0] ??
    origin
  ).replace(/[市区县]/g, '');
  const matches = rides.filter((ride) => {
    const rideDestination = ride.destination
      .replace(/\s/g, '')
      .replace(/滑雪场|雪场/g, '');
    const rideCity = ride.origin.split(' · ')[0]?.replace(/[市区县]/g, '') ?? ride.origin;
    return (
      ride.owner.id !== currentUser.id &&
      ride.status === 'recruiting' &&
      (!destinationKey || rideDestination.includes(destinationKey)) &&
      (!cityKey || rideCity.includes(cityKey)) &&
      ride.dateLabel === date
    );
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={['#C9E9F9', '#F4F8FB', '#FFF3F6']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 102 }]}
      >
        <View style={styles.topbar}>
          <BrandLogo size={34} />
          <View style={styles.datePill}>
            <AppIcon name="calendar" size={13} color={colors.ink} />
            <Text style={styles.datePillText}>{date.replace(' · ', ' ')}</Text>
          </View>
        </View>

        <View style={styles.heading}>
          <Text style={styles.title}>找拼车</Text>
          <Text style={styles.subtitle}>从出发区域到雪场，找到顺路的车。</Text>
        </View>

        <View style={styles.searchCard}>
          <LocationPicker
            label="出发"
            value={origin}
            placeholder="搜索出发地，或直接输入"
            options={originOptions}
            onChange={setOrigin}
          />
          <View style={styles.rule} />
          <LocationPicker
            label="雪场"
            value={destination}
            placeholder="搜索雪场，或直接输入"
            options={destinationOptions}
            onChange={setDestination}
            dotStyle="destination"
          />
        </View>

        <View style={styles.dates}>
          {dateOptions.map((option) => {
            const selected = option === date;
            return (
              <Text
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setDate(option)}
                style={[styles.dateOption, selected && styles.dateOptionActive]}
              >
                {option.replace(' · ', '\n')}
              </Text>
            );
          })}
        </View>

        <View style={styles.resultHead}>
          <Text style={styles.sectionTitle}>顺路出发</Text>
          <Text style={styles.resultCount}>{matches.length} 个行程</Text>
        </View>

        <View style={styles.list}>
          {matches.map((ride) => <RideCard key={ride.id} ride={ride} />)}
        </View>

        {matches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>这个时间还没有顺路车。</Text>
            <Text style={styles.emptyText}>换个日期看看，或者自己发起一段拼车。</Text>
            <Text
              accessibilityRole="button"
              onPress={() => router.push('/publish')}
              style={styles.emptyAction}
            >
              发布拼车
            </Text>
          </View>
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
    marginTop: spacing.sm,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePill: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  datePillText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '600',
  },
  heading: {
    marginTop: spacing.xxl,
  },
  title: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 10,
  },
  searchCard: {
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.9)',
  },
  rule: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 5,
  },
  dates: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateOption: {
    flex: 1,
    minHeight: 47,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,.62)',
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 7,
  },
  dateOptionActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
    color: colors.white,
  },
  resultHead: {
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
  resultCount: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 9,
  },
  list: {
    gap: spacing.md,
  },
  empty: {
    borderRadius: radius.xl,
    backgroundColor: colors.paper,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.line,
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
    color: colors.blue,
    fontFamily: type.body,
    fontSize: 10,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
});
