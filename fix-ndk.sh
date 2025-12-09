#!/bin/bash

echo "🔧 NDK 문제 해결 스크립트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 방법 1: Android Studio SDK Manager에서 NDK 재설치
echo "📝 방법 1: Android Studio에서 NDK 재설치 (권장)"
echo ""
echo "1. Android Studio 실행"
echo "2. Tools > SDK Manager 클릭"
echo "3. SDK Tools 탭 선택"
echo "4. 'Show Package Details' 체크"
echo "5. 'NDK (Side by side)' 체크 및 버전 선택 (27.1.12297006 또는 최신 버전)"
echo "6. Apply 클릭하여 다운로드 및 설치"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 방법 2: 명령어로 NDK 설치 시도
export ANDROID_HOME=$HOME/Library/Android/sdk

if [ -d "$ANDROID_HOME/cmdline-tools" ]; then
    echo "📝 방법 2: 명령어로 NDK 설치 시도"
    echo ""
    LATEST_CMD=$(ls -t $ANDROID_HOME/cmdline-tools 2>/dev/null | head -1)
    if [ ! -z "$LATEST_CMD" ]; then
        CMD_TOOLS="$ANDROID_HOME/cmdline-tools/$LATEST_CMD/bin"
        echo "sdkmanager를 사용하여 NDK 설치 중..."
        $CMD_TOOLS/sdkmanager "ndk;27.1.12297006" 2>&1 | grep -E "Installed|Failed|Done" || echo "sdkmanager 실행 중 문제 발생"
    fi
fi

echo ""
echo "✅ 스크립트 완료"
echo ""
echo "NDK 설치 후 다음 명령어를 실행하세요:"
echo "  npx expo run:android"
