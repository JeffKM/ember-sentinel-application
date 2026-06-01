import { Alert, Platform } from 'react-native';

/**
 * 웹 호환 확인 다이얼로그 (웹: window.confirm, 네이티브: Alert.alert)
 */
export function confirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    } else {
      onCancel?.();
    }
  } else {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: onCancel },
      { text: '확인', onPress: onConfirm },
    ]);
  }
}

/**
 * 웹 호환 정보 알림 (웹: window.alert, 네이티브: Alert.alert)
 */
export function infoAlert(title: string, message: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: '확인', onPress: onOk }]);
  }
}
