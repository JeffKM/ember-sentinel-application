# ExpoPushTokenManager 에러 해결 방법

## 문제
`Cannot find native module 'ExpoPushTokenManager'` 에러가 발생하는 경우

## 원인
`expo-notifications`는 네이티브 모듈이므로 development build에서 네이티브 프로젝트를 다시 빌드해야 합니다.

## 해결 방법

### 방법 1: Xcode에서 직접 빌드 (권장)

1. **Xcode 열기**
   ```bash
   open ios/EmberSentinel.xcworkspace
   ```

2. **Product > Clean Build Folder** (Shift + Cmd + K)

3. **Product > Build** (Cmd + B)

4. **시뮬레이터에서 실행** (Cmd + R)

### 방법 2: 터미널에서 클린 빌드

```bash
# iOS 빌드 폴더 정리
rm -rf ios/build

# CocoaPods 재설치
cd ios
pod deintegrate
pod install
cd ..

# 앱 재빌드
npx expo run:ios
```

### 방법 3: 완전히 새로 빌드

```bash
# 네이티브 폴더 삭제
rm -rf ios android

# 네이티브 프로젝트 재생성
npx expo prebuild

# iOS 빌드
npx expo run:ios
```

## 확인 사항

1. **app.json에 expo-notifications 플러그인 추가 확인**
   ```json
   "plugins": [
     [
       "expo-notifications",
       {
         "icon": "./assets/icon.png",
         "color": "#FF3B30"
       }
     ]
   ]
   ```

2. **package.json에 expo-notifications 설치 확인**
   ```json
   "expo-notifications": "^0.32.13"
   ```

## 참고

- Expo Go에서는 `expo-notifications`가 작동하지 않습니다
- Development build를 사용해야 합니다
- 네이티브 모듈을 추가한 후에는 반드시 네이티브 프로젝트를 다시 빌드해야 합니다








