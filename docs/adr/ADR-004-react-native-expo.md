# ADR-004: 모바일 앱에 React Native + Expo 선택

## 상태

**Accepted** (2025-03)

## 맥락

화재 감지 알림을 수신하고, 실시간 CCTV 스트리밍을 시청하며, 화재 이벤트 이력을 관리하는 모바일 앱이 필요하다. 팀 기술 스택과 프로젝트 제약 조건:

1. **크로스플랫폼 필수**: Android + iOS 동시 지원 (팀원 중 iOS/Android 네이티브 경험 없음)
2. **팀 역량**: 웹 프론트엔드(React) 경험 보유
3. **실시간 기능**: WebRTC 영상 스트리밍, FCM 푸시 알림
4. **개발 기간**: 캡스톤 프로젝트 한 학기 (약 4개월)

### 후보 프레임워크

| 프레임워크                    | 언어                  | 렌더링           | 네이티브 접근               | 생태계         |
| ----------------------------- | --------------------- | ---------------- | --------------------------- | -------------- |
| **React Native + Expo**       | JavaScript/TypeScript | 네이티브 위젯    | Expo 모듈 + 네이티브 브릿지 | 가장 큰 생태계 |
| **Flutter**                   | Dart                  | Skia 자체 렌더링 | Platform Channel            | 빠르게 성장 중 |
| **네이티브 (Kotlin + Swift)** | Kotlin/Swift          | 네이티브         | 직접 접근                   | 플랫폼별 최적  |

## 결정

**React Native 0.81 + Expo 54 (New Architecture 활성화)** 를 선택한다.

### 선택 근거

1. **팀 기술 매칭**: React 경험을 직접 활용 가능. Dart(Flutter)나 Kotlin/Swift 학습 비용 절감
2. **Expo 생태계**: EAS Build로 네이티브 빌드 자동화, OTA 업데이트로 앱스토어 재배포 없이 핫픽스 가능
3. **New Architecture**: React Native 0.76+ New Architecture(JSI, Fabric, TurboModules)로 네이티브 성능에 근접
4. **라이브러리 호환성**: LiveKit React Native SDK, Firebase React Native SDK, Google/Kakao 소셜 로그인 SDK 모두 React Native 지원
5. **빠른 프로토타이핑**: Expo Go로 네이티브 빌드 없이 즉시 테스트 가능

## 대안 분석

### Flutter — 기각

- 장점: Skia 렌더링으로 일관된 UI, 높은 성능, Hot Reload
- 단점:
  - 팀에 Dart 경험 없음 → 학습 기간 2~3주 추가 필요
  - LiveKit Flutter SDK가 React Native 대비 성숙도 낮음
  - Kakao 로그인 Flutter 플러그인 안정성 미확인

### 네이티브 개발 (Kotlin + Swift) — 기각

- 장점: 최고 성능, 플랫폼 API 완전 접근
- 단점:
  - 2개 코드베이스 유지 필요 → 4명 팀에서 비현실적
  - 네이티브 개발 경험 없는 팀에서 한 학기 내 완성 불가

### React Native 단독 (Expo 미사용) — 기각

- 장점: 네이티브 모듈 자유 추가
- 단점:
  - Xcode/Android Studio 빌드 설정을 직접 관리해야 함
  - EAS Build 없이 CI/CD 파이프라인 구축 복잡
  - Expo의 편의 기능(OTA, 알림, 카메라 등) 직접 구현 필요

## 결과

### 긍정적

- 단일 코드베이스로 Android/iOS 동시 개발 → 개발 속도 2배 향상
- Expo Go로 개발 초기 빠른 프로토타이핑 → 중반 이후 Development Build로 전환
- React 컴포넌트 패턴 활용으로 9개 화면을 효율적으로 구현
- EAS Build로 CI 자동 빌드 구축 용이

### 부정적

- New Architecture 전환 시 일부 라이브러리 호환성 문제 발생 (Metro 설정 워크어라운드 필요)
- Expo Go에서 FCM 네이티브 토큰 미지원 → 실기기 Development Build 필수
- JavaScript 기반으로 시작하여 타입 안전성 부족 (이후 TypeScript 마이그레이션 진행)
- Android Gradle 빌드 순서 의존성 이슈 해결에 시간 소요

### 트레이드오프 요약

```
크로스플랫폼 + 팀 기술 매칭 + 빠른 개발  ←→  네이티브 대비 성능 제약 + Expo 의존성
```
