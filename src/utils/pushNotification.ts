import * as Notifications from 'expo-notifications';
import { simulateFireEvent } from '../data/demoData';
import type { SimulationData } from '../types';

/**
 * 테스트용 로컬 알림 전송
 * 실제 서버에서 푸시 알림을 보낼 때는 Expo Push Notification API를 사용하세요
 */
export const sendTestNotification = async (
  title?: string,
  body?: string,
  data: Record<string, unknown> = {},
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || '특정 알림',
        body: body || '3층 305호에서 허가습니다',
        subtitle: '긴급 상황 - 즉시 확인 필요',
        data: {
          type: 'fire_alert',
          roomId: 1,
          room: 'A동 3층 305호',
          cameraId: 1,
          camera: {
            id: 1,
            name: '카메라 1',
            location: '305호 입구',
            status: 'error',
            message: '화재 감지',
          },
          ...data, // 추가 데이터는 덮어쓰기
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // 즉시 전송
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
};

/**
 * Expo Push Notification API를 사용하여 알림 전송
 * 서버에서 사용할 함수 (예시)
 */
export const sendPushNotification = async (
  expoPushToken: string,
  title?: string,
  body?: string,
  data: Record<string, unknown> = {},
): Promise<unknown> => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title || '특정 알림',
    body: body || '3층 305호에서 허가습니다',
    data: data,
    priority: 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * 화재 감지 시뮬레이션 알림 전송
 * 데모 데이터에서 랜덤 이벤트를 생성하여 로컬 알림을 발송한다.
 * 반환값의 simData를 사용해 알림 후 화면 이동에 활용할 수 있다.
 */
export const sendFireSimulationNotification = async (): Promise<SimulationData> => {
  const simData = simulateFireEvent();

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 화재 감지!',
        body: `${simData.room.roomAlias}에서 ${simData.event.detectionType}`,
        subtitle: `위험 등급: ${simData.event.riskLevel}`,
        data: {
          type: 'fire_alert',
          roomId: simData.room.roomId,
          room: simData.room.roomAlias,
          cameraId: simData.camera.cameraId,
          camera: simData.camera,
          simData,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('시뮬레이션 알림 전송 실패:', error);
  }

  return simData;
};
