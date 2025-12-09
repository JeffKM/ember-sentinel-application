#!/bin/bash

# Android SDK 설정 스크립트

echo "🔍 Android SDK 경로 확인 중..."

# 가능한 경로들 확인
POSSIBLE_PATHS=(
  "$HOME/Library/Android/sdk"
  "$HOME/Android/Sdk"
  "/Users/$USER/Library/Android/sdk"
)

ANDROID_SDK_PATH=""

for path in "${POSSIBLE_PATHS[@]}"; do
  if [ -d "$path" ]; then
    ANDROID_SDK_PATH="$path"
    echo "✅ Android SDK 발견: $ANDROID_SDK_PATH"
    break
  fi
done

if [ -z "$ANDROID_SDK_PATH" ]; then
  echo "❌ Android SDK를 찾을 수 없습니다."
  echo ""
  echo "Android Studio를 설치하세요:"
  echo "  https://developer.android.com/studio"
  echo ""
  echo "설치 후 Android Studio를 실행하고 SDK를 설치하세요."
  exit 1
fi

# 환경 변수 설정
echo ""
echo "📝 환경 변수 설정 중..."

if [ -f "$HOME/.zshrc" ]; then
  CONFIG_FILE="$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
  CONFIG_FILE="$HOME/.bash_profile"
elif [ -f "$HOME/.bashrc" ]; then
  CONFIG_FILE="$HOME/.bashrc"
else
  CONFIG_FILE="$HOME/.zshrc"
fi

# 이미 설정되어 있는지 확인
if grep -q "ANDROID_HOME" "$CONFIG_FILE" 2>/dev/null; then
  echo "⚠️  이미 환경 변수가 설정되어 있습니다."
  echo "    $CONFIG_FILE 파일을 확인하세요."
else
  cat >> "$CONFIG_FILE" << EOL

# Android SDK
export ANDROID_HOME=$ANDROID_SDK_PATH
export PATH=\$PATH:\$ANDROID_HOME/emulator
export PATH=\$PATH:\$ANDROID_HOME/platform-tools
export PATH=\$PATH:\$ANDROID_HOME/tools
export PATH=\$PATH:\$ANDROID_HOME/tools/bin
EOL
  echo "✅ 환경 변수가 $CONFIG_FILE에 추가되었습니다."
  echo ""
  echo "다음 명령어로 설정을 적용하세요:"
  echo "  source $CONFIG_FILE"
  echo ""
  echo "또는 새 터미널 창을 여세요."
fi

# 현재 셸에 임시 적용
export ANDROID_HOME=$ANDROID_SDK_PATH
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

echo ""
echo "✅ 현재 셸에 임시로 환경 변수가 설정되었습니다."
echo ""
echo "📋 확인:"
echo "  ANDROID_HOME: $ANDROID_HOME"
echo "  adb 버전: $(adb version 2>/dev/null | head -1 || echo 'adb를 찾을 수 없습니다')"
echo ""
echo "🚀 다음 단계:"
echo "  1. Android Studio에서 에뮬레이터 생성"
echo "  2. 에뮬레이터 실행"
echo "  3. npx expo run:android 실행"
