# 안드로이드 에뮬레이터 설정 가이드

## 1. Android Studio 설치

### macOS에서 설치:
1. [Android Studio 다운로드](https://developer.android.com/studio)
2. 다운로드한 `.dmg` 파일을 실행하여 설치
3. 설치 과정에서 **Android SDK**, **Android SDK Platform**, **Android Virtual Device (AVD)** 설치 확인

## 2. 환경 변수 설정

터미널에서 다음 명령어로 환경 변수를 설정하세요:

### zsh (기본 셸) 사용 시:
```bash
# ~/.zshrc 파일에 추가
echo '' >> ~/.zshrc
echo '# Android SDK' >> ~/.zshrc
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/tools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/tools/bin' >> ~/.zshrc

# 설정 적용
source ~/.zshrc
```

### bash 사용 시:
```bash
# ~/.bash_profile 또는 ~/.bashrc 파일에 추가
echo '' >> ~/.bash_profile
echo '# Android SDK' >> ~/.bash_profile
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.bash_profile
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.bash_profile
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bash_profile
echo 'export PATH=$PATH:$ANDROID_HOME/tools' >> ~/.bash_profile
echo 'export PATH=$PATH:$ANDROID_HOME/tools/bin' >> ~/.bash_profile

# 설정 적용
source ~/.bash_profile
```

## 3. Android Studio에서 AVD (에뮬레이터) 생성

1. Android Studio 실행
2. **More Actions** > **Virtual Device Manager** 클릭
3. **Create Device** 클릭
4. 기기 선택 (예: Pixel 5)
5. 시스템 이미지 선택 (API 33 또는 34 권장)
   - **Release Name**: Tiramisu (API 33) 또는 UpsideDownCake (API 34)
   - **ABI**: x86_64 (Intel Mac) 또는 arm64-v8a (Apple Silicon)
6. **Finish** 클릭하여 에뮬레이터 생성

## 4. 에뮬레이터 실행

### 방법 1: Android Studio에서 실행
- Virtual Device Manager에서 생성한 에뮬레이터 옆의 ▶️ 버튼 클릭

### 방법 2: 명령어로 실행
```bash
# 에뮬레이터 목록 확인
emulator -list-avds

# 에뮬레이터 실행 (에뮬레이터 이름으로 교체)
emulator -avd <에뮬레이터_이름>
```

## 5. 프로젝트 실행

에뮬레이터가 실행된 후:

```bash
# Expo 개발 서버 시작
npx expo start

# 별도 터미널에서 안드로이드 빌드 및 실행
npx expo run:android
```

또는 한 번에:
```bash
npx expo run:android
```

## 6. 문제 해결

### ANDROID_HOME이 인식되지 않는 경우:
```bash
# 현재 셸에서 임시로 설정
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# 확인
echo $ANDROID_HOME
adb version
```

### 에뮬레이터가 실행되지 않는 경우:
- Android Studio에서 에뮬레이터를 직접 실행해보기
- 에뮬레이터의 시스템 이미지가 제대로 설치되었는지 확인
- HAXM (Intel) 또는 Hypervisor (Apple Silicon) 확인

### 빌드 오류가 발생하는 경우:
```bash
# 프로젝트 클린
cd android
./gradlew clean
cd ..

# prebuild 재실행
npx expo prebuild --clean

# 다시 빌드
npx expo run:android
```

## 7. FCM 토큰 테스트

안드로이드 에뮬레이터에서 FCM 토큰을 받으려면:
1. 에뮬레이터가 실행 중이어야 함
2. Google Play Services가 설치되어 있어야 함 (API 33+ 에뮬레이터에는 기본 포함)
3. 앱에서 알림 권한 허용

## 참고
- Android Studio 공식 문서: https://developer.android.com/studio
- Expo Android 가이드: https://docs.expo.dev/workflow/android-studio/



