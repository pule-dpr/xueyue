import * as Haptics from 'expo-haptics';

export function tapFeedback() {
  Haptics.selectionAsync().catch(() => undefined);
}

export function successFeedback() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
