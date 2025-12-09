# Firebase FCM 설정 가이드

## 1. Firebase 콘솔에서 설정 확인

Firebase 콘솔 (https://console.firebase.google.com)에서 다음 정보를 확인하세요:

1. **프로젝트 설정 > 일반** 탭으로 이동
2. **앱** 섹션에서 웹 앱이 추가되어 있는지 확인
   - 없으면 "웹 앱 추가" 버튼 클릭하여 추가
3. **Firebase SDK 설정** 섹션에서 다음 정보를 복사:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## 2. 코드에 Firebase 설정 추가

`src/config/firebase.js` 파일을 열고 `firebaseConfig` 객체를 업데이트하세요:

```javascript
const firebaseConfig = {
  apiKey: "복사한_API_KEY",
  authDomain: "복사한_AUTH_DOMAIN",
  projectId: "복사한_PROJECT_ID",
  storageBucket: "복사한_STORAGE_BUCKET",
  messagingSenderId: "복사한_MESSAGING_SENDER_ID",
  appId: "복사한_APP_ID",
};
```

## 3. Firebase Cloud Messaging 설정

### iOS 설정
1. Firebase 콘솔 > 프로젝트 설정 > 클라우드 메시징
2. **APNs 인증 키** 업로드 (선택사항, 프로덕션용)
3. iOS 앱의 Bundle ID 확인: `com.embersentinel.app`

### Android 설정
1. Firebase 콘솔 > 프로젝트 설정 > 클라우드 메시징
2. Android 앱의 Package name 확인: `com.embersentinel.app`
3. `google-services.json` 파일 다운로드 (필요시)

## 4. 서버에서 FCM 알림 전송

Firebase Admin SDK를 사용하여 서버에서 알림을 전송할 수 있습니다:

```javascript
// Node.js 예시
const admin = require('firebase-admin');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 알림 전송
const message = {
  notification: {
    title: '특정 알림',
    body: '3층 305호에서 허가습니다',
  },
  data: {
    room: '305',
    floor: '3',
    type: 'fire_alert',
  },
  token: '사용자의_FCM_토큰', // 앱에서 발급받은 토큰
};

admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
```

## 5. Expo Push Notification과 Firebase 연동

Expo에서는 `expo-notifications`를 사용하여 푸시 알림을 받습니다.
발급받은 Expo Push Token을 Firebase와 함께 사용할 수 있습니다.

앱에서 토큰을 발급받으면:
1. 서버에 토큰 저장
2. Firebase Admin SDK 또는 Expo Push Notification API로 알림 전송

## 참고사항

- Expo Push Token은 `ExponentPushToken[...]` 형식입니다
- Firebase FCM Token은 다른 형식이지만, Expo에서는 Expo Push Token을 사용합니다
- 두 토큰 모두 서버에서 알림을 보낼 수 있습니다








