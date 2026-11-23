import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { AppIcon, type IconName } from '@/components/AppIcon';
import { tapFeedback } from '@/lib/haptics';
import { colors, radius, spacing, type } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  compact = false,
}: ButtonProps) {
  const textColor = variant === 'primary' || variant === 'danger' ? colors.white : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        styles[variant],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? <AppIcon name={icon} size={16} color={textColor} /> : null}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  compact: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  primary: {
    backgroundColor: colors.ink,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  soft: {
    backgroundColor: colors.pink,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  label: {
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '700',
  },
});
