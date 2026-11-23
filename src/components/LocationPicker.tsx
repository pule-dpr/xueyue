import { type ElementRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppIcon } from '@/components/AppIcon';
import { searchLocalPlaces, searchOnlinePlaces } from '@/services/placeSearch';
import { useApp } from '@/store/AppProvider';
import { colors, radius, spacing, type } from '@/theme';
import type { PlaceSuggestion } from '@/types';

type LocationPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  dotStyle?: 'origin' | 'destination' | 'pickup';
};

export function LocationPicker({
  label,
  value,
  onChange,
  options,
  placeholder,
  dotStyle = 'origin',
}: LocationPickerProps) {
  const { savedLocations, rememberLocation } = useApp();
  const [open, setOpen] = useState(false);
  const [remotePlaces, setRemotePlaces] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<ElementRef<typeof TextInput>>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => {
    const local = searchLocalPlaces(value, [...options, ...savedLocations]);
    const merged = [...remotePlaces, ...local];
    const seen = new Set<string>();
    return merged.filter((place) => {
      const key = place.name.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [options, remotePlaces, savedLocations, value]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!open || value.trim().length < 2) {
        setRemotePlaces([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchOnlinePlaces(value, controller.signal)
        .then((places) => {
          if (!controller.signal.aborted) setRemotePlaces(places);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemotePlaces([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, value]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const choose = (next: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const cleaned = next.trim();
    onChange(cleaned);
    rememberLocation(cleaned);
    setOpen(false);
    inputRef.current?.blur();
  };

  const choosePlace = (place: PlaceSuggestion) => {
    const city = place.address
      .split(' · ')
      .find((part) => part.endsWith('市') || part.endsWith('州'));
    choose(city && !place.name.includes(city) ? `${place.name} · ${city}` : place.name);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.helper}>可输入任意地点</Text>
      </View>
      <View style={[styles.inputWrap, open && styles.inputWrapOpen]}>
        <View
          style={[
            styles.dot,
            dotStyle === 'destination' && styles.dotDestination,
            dotStyle === 'pickup' && styles.dotPickup,
          ]}
        />
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          value={value}
          onChangeText={(text) => {
            setOpen(true);
            onChange(text);
          }}
          onFocus={() => {
            if (closeTimer.current) clearTimeout(closeTimer.current);
            setOpen(true);
          }}
          onBlur={() => {
            const cleaned = value.trim();
            if (cleaned) rememberLocation(cleaned);
            closeTimer.current = setTimeout(() => setOpen(false), 160);
          }}
          onSubmitEditing={() => {
            const cleaned = value.trim();
            if (cleaned) rememberLocation(cleaned);
            setOpen(false);
            inputRef.current?.blur();
          }}
          placeholder={placeholder}
          placeholderTextColor="#8B98A1"
          returnKeyType="done"
          style={styles.input}
        />
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`清除${label}`}
            onPress={() => onChange('')}
            hitSlop={8}
            style={styles.clear}
          >
            <AppIcon name="close" size={13} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View style={styles.panel}>
          {searching ? (
            <View style={styles.searching}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={styles.searchingText}>正在搜索地点</Text>
            </View>
          ) : null}
          {suggestions.map((place) => {
            const selectedName = value.trim().split(' · ')[0];
            return (
            <Pressable
              key={place.id}
              accessibilityRole="button"
              accessibilityLabel={`选择${place.name}，${place.address}`}
              onPress={() => choosePlace(place)}
              style={({ pressed }) => [
                styles.option,
                place.name === selectedName && styles.optionActive,
                pressed && styles.optionPressed,
              ]}
            >
              <AppIcon
                name="pin"
                size={14}
                color={place.name === selectedName ? colors.mintDark : colors.muted}
              />
              <View style={styles.optionCopy}>
                <Text
                  style={[
                    styles.optionText,
                    place.name === selectedName && styles.optionTextActive,
                  ]}
                >
                  {place.name}
                </Text>
                <Text style={styles.optionAddress}>{place.address}</Text>
              </View>
              {place.name === selectedName ? (
                <AppIcon name="check" size={14} color={colors.mintDark} />
              ) : null}
            </Pressable>
            );
          })}
          {value.trim() &&
          !suggestions.some((item) => item.name === value.trim().split(' · ')[0]) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`使用自定义地点${value.trim()}`}
              onPress={() => choose(value)}
              style={({ pressed }) => [styles.customOption, pressed && styles.optionPressed]}
            >
              <View style={styles.customIcon}>
                <AppIcon name="plus" size={13} color={colors.ink} />
              </View>
              <View style={styles.customCopy}>
                <Text style={styles.customTitle}>使用自定义地点</Text>
                <Text style={styles.customValue}>{value.trim()}</Text>
              </View>
            </Pressable>
          ) : null}
          {!searching && suggestions.length === 0 ? (
            <Text style={styles.noResult}>没有匹配的推荐地点，输入完成后可直接使用。</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  helper: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 7,
  },
  inputWrap: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWrapOpen: {
    borderColor: colors.blue,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.inkSoft,
  },
  dotDestination: {
    borderColor: colors.berry,
    backgroundColor: colors.berry,
  },
  dotPickup: {
    borderColor: colors.lavenderInk,
    backgroundColor: colors.lavender,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clear: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.snow,
  },
  panel: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.line,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 6,
    gap: 5,
  },
  option: {
    minHeight: 38,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionActive: {
    backgroundColor: colors.mint,
  },
  optionPressed: {
    opacity: 0.72,
  },
  optionText: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 9,
  },
  optionCopy: {
    flex: 1,
  },
  optionAddress: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 7,
    marginTop: 2,
  },
  optionTextActive: {
    color: colors.mintDark,
    fontWeight: '700',
  },
  customOption: {
    minHeight: 52,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F6F8FA',
  },
  customIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCopy: {
    flex: 1,
  },
  customTitle: {
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 9,
    fontWeight: '700',
  },
  customValue: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    marginTop: 2,
  },
  noResult: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  searching: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  searchingText: {
    color: colors.muted,
    fontFamily: type.body,
    fontSize: 8,
  },
});
