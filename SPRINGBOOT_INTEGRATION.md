# 스프링부트 서버 연동 가이드

## 현재 상태

✅ **앱 내에서만 작동**: 현재는 앱 내에서 푸시 알림이 정상 작동합니다.
- FCM 토큰 발급 및 로컬 저장
- 테스트 알림 전송 (HomeScreen의 "🔔 테스트 알림" 버튼)
- 알림 수신 시 UI 표시

## 서버 연동이 필요한 경우

서버에서 푸시 알림을 보내야 할 때만 스프링부트 서버와 연동하면 됩니다.

### 연동 시나리오

1. **화재 감지 시 서버에서 알림 전송**
   - 화재 감지 시스템이 서버에 이벤트 전송
   - 서버가 해당 구역의 사용자들에게 푸시 알림 전송

2. **사용자별 알림 관리**
   - 사용자별로 FCM 토큰 저장
   - 특정 사용자에게만 알림 전송

## 스프링부트 서버 구현 예시

### 1. 의존성 추가 (pom.xml)

```xml
<dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.2.0</version>
</dependency>
```

### 2. Firebase Admin 초기화

```java
@Configuration
public class FirebaseConfig {
    
    @PostConstruct
    public void initialize() {
        try {
            FileInputStream serviceAccount = 
                new FileInputStream("path/to/firebase-service-account-key.json");
            
            FirebaseOptions options = new FirebaseOptions.Builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();
            
            FirebaseApp.initializeApp(options);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

### 3. FCM 토큰 등록 API

```java
@RestController
@RequestMapping("/api/fcm")
public class FCMController {
    
    @Autowired
    private FCMTokenService fcmTokenService;
    
    @PostMapping("/register")
    public ResponseEntity<?> registerToken(
            @RequestBody FCMTokenRequest request,
            @RequestHeader("Authorization") String token) {
        
        // 사용자 인증 확인
        String userId = extractUserIdFromToken(token);
        
        // FCM 토큰 저장
        fcmTokenService.saveToken(userId, request.getToken(), request.getPlatform());
        
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/unregister")
    public ResponseEntity<?> unregisterToken(
            @RequestBody FCMTokenRequest request,
            @RequestHeader("Authorization") String token) {
        
        String userId = extractUserIdFromToken(token);
        fcmTokenService.deleteToken(userId, request.getToken());
        
        return ResponseEntity.ok().build();
    }
}
```

### 4. 푸시 알림 전송 서비스

```java
@Service
public class FCMService {
    
    public void sendNotification(String fcmToken, String title, String body, Map<String, String> data) {
        try {
            Message message = Message.builder()
                .setToken(fcmToken)
                .setNotification(Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build())
                .putAllData(data)
                .setApnsConfig(ApnsConfig.builder()
                    .setAps(Aps.builder()
                        .setSound("default")
                        .build())
                    .build())
                .build();
            
            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("Successfully sent message: " + response);
        } catch (FirebaseMessagingException e) {
            System.err.println("Error sending message: " + e.getMessage());
        }
    }
    
    // 특정 구역의 모든 사용자에게 알림 전송
    public void sendNotificationToRoom(String roomId, String title, String body) {
        List<String> tokens = fcmTokenService.getTokensByRoom(roomId);
        
        for (String token : tokens) {
            sendNotification(token, title, body, Map.of(
                "room", roomId,
                "type", "fire_alert"
            ));
        }
    }
}
```

### 5. 화재 감지 이벤트 처리

```java
@RestController
@RequestMapping("/api/alerts")
public class FireAlertController {
    
    @Autowired
    private FCMService fcmService;
    
    @PostMapping("/fire-detected")
    public ResponseEntity<?> fireDetected(@RequestBody FireAlertRequest request) {
        // 화재 감지 이벤트 처리
        String roomId = request.getRoomId();
        String message = String.format("%s에서 화재가 감지되었습니다", roomId);
        
        // 해당 구역의 사용자들에게 푸시 알림 전송
        fcmService.sendNotificationToRoom(
            roomId,
            "특정 알림",
            message
        );
        
        return ResponseEntity.ok().build();
    }
}
```

## 앱 설정

### API 서버 URL 설정

`src/config/api.js` 파일에서 서버 URL을 설정하세요:

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8080/api' // 개발 환경
  : 'https://your-server.com/api'; // 프로덕션 환경
```

### 서버 연동 활성화

현재 코드는 서버 연동이 실패해도 앱이 정상 작동하도록 되어 있습니다.
서버가 준비되면 자동으로 연동됩니다.

## 테스트 방법

1. **앱에서 FCM 토큰 확인**
   - 앱 실행 후 콘솔에서 FCM 토큰 확인
   - 또는 AsyncStorage에서 `fcmToken` 확인

2. **서버에서 알림 전송 테스트**
   ```bash
   curl -X POST http://localhost:8080/api/fcm/send \
     -H "Content-Type: application/json" \
     -d '{
       "token": "사용자의_FCM_토큰",
       "title": "테스트 알림",
       "body": "서버에서 보낸 알림입니다"
     }'
   ```

## 주의사항

- **서버 연동은 선택사항**: 서버가 없어도 앱 내에서 푸시 알림은 정상 작동합니다.
- **Firebase Service Account Key**: 서버에서 Firebase Admin SDK를 사용하려면 Firebase 콘솔에서 Service Account Key를 다운로드해야 합니다.
- **토큰 관리**: 사용자가 앱을 재설치하거나 로그아웃하면 토큰이 변경될 수 있으므로 주기적으로 갱신해야 합니다.








