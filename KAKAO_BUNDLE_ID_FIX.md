# 카카오 로그인 번들 ID 검증 실패 해결 가이드

## 문제
"번들 ID 검증 실패" 에러가 계속 발생하는 경우

## 해결 방법

### 1. 카카오 개발자 콘솔에서 번들 ID 확인 및 재설정

1. **카카오 개발자 콘솔 접속**
   - https://developers.kakao.com
   - 내 애플리케이션 선택

2. **앱 설정 > 일반**
   - 앱 키 확인:
     - Native App Key: `***REMOVED_KAKAO_KEY***` (현재 사용 중)

3. **플랫폼 설정**
   - iOS 플랫폼이 등록되어 있는지 확인
   - 번들 ID가 정확히 `com.embersentinel.app`로 입력되어 있는지 확인
   - **주의**: 공백, 대소문자, 특수문자 모두 정확히 일치해야 함

4. **iOS 플랫폼 재등록 (권장)**
   - 기존 iOS 플랫폼 삭제
   - iOS 플랫폼 다시 추가
   - 번들 ID: `com.embersentinel.app` (복사-붙여넣기 권장)
   - 저장
   - **2-3분 대기** (카카오 서버 반영 시간)

### 2. 앱에서 실제 번들 ID 확인

앱 실행 후 터미널 로그에서 실제 번들 ID 확인:
```
🔍 [시간] [KakaoError]
{
  "bundleId": "실제 번들 ID",
  "expectedBundleId": "com.embersentinel.app"
}
```

### 3. Xcode에서 번들 ID 확인

1. Xcode에서 프로젝트 열기
2. 프로젝트 선택 > TARGETS > EmberSentinel
3. General 탭 > Bundle Identifier 확인
4. `com.embersentinel.app`인지 확인

### 4. 번들 ID가 다른 경우

만약 실제 번들 ID가 `com.embersentinel.app`가 아니라면:

**옵션 1: 카카오 개발자 콘솔에 실제 번들 ID 등록**
- 실제 번들 ID를 카카오 개발자 콘솔에 등록

**옵션 2: Xcode에서 번들 ID 변경**
- Xcode에서 Bundle Identifier를 `com.embersentinel.app`로 변경
- 다시 빌드

### 5. 네이티브 앱 키 확인

카카오 개발자 콘솔에서:
- **앱 키** 탭
- **Native App Key** 확인: `***REMOVED_KAKAO_KEY***`
- 이 키가 `app.json`과 `Info.plist`의 `KAKAO_APP_KEY`와 일치하는지 확인

### 6. 완전히 새로 빌드

```bash
# iOS 빌드 폴더 정리
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock

# CocoaPods 재설치
cd ios
pod install
cd ..

# 앱 재빌드
npx expo run:ios
```

## 확인 체크리스트

- [ ] 카카오 개발자 콘솔에 iOS 플랫폼 등록됨
- [ ] 번들 ID가 정확히 `com.embersentinel.app`로 입력됨
- [ ] Native App Key가 `***REMOVED_KAKAO_KEY***`로 설정됨
- [ ] Xcode 프로젝트의 Bundle Identifier가 `com.embersentinel.app`
- [ ] `app.json`의 `bundleIdentifier`가 `com.embersentinel.app`
- [ ] `Info.plist`의 `KAKAO_APP_KEY`가 Native App Key와 일치
- [ ] iOS 플랫폼 저장 후 2-3분 대기

## 여전히 안 되는 경우

1. **카카오 고객센터 문의**
   - 번들 ID 검증이 계속 실패하는 경우
   - 카카오 개발자 콘솔에서 문의하기

2. **다른 카카오 앱과의 충돌 확인**
   - 같은 번들 ID를 사용하는 다른 카카오 앱이 있는지 확인

3. **카카오 SDK 버전 확인**
   - `@react-native-kakao/core` 버전 확인
   - 최신 버전으로 업데이트 시도








