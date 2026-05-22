#!/bin/bash
# capture-screenshots.sh — ADB를 이용한 실기기 스크린샷 자동 캡처
#
# 사용법:
#   chmod +x scripts/capture-screenshots.sh
#   ./scripts/capture-screenshots.sh
#
# 사전 요구사항:
#   - Android 실기기 USB 연결 + USB 디버깅 활성화
#   - adb 설치 (brew install android-platform-tools)
#   - 앱이 실기기에 설치되어 있어야 함

set -euo pipefail

OUTPUT_DIR="docs/screenshots"
DEVICE_TEMP="/sdcard/ember-screenshot.png"
MAX_WIDTH=1080

# 캡처 대상 화면 목록
SCREENS=(
  "01-splash:스플래시 화면"
  "02-login:로그인 화면"
  "03-home:홈 화면 (방 목록)"
  "04-room-detail:방 상세"
  "05-fire-alert:화재 경보 상세"
  "06-cctv-live:CCTV 실시간 영상"
  "07-fire-location:화재 위치 평면도"
  "08-fire-history:화재 이벤트 이력"
  "09-recording:녹화 영상 재생"
)

echo "=== Ember Sentinel 스크린샷 캡처 ==="
echo ""

# ADB 연결 확인
if ! adb devices | grep -q "device$"; then
  echo "오류: ADB 디바이스가 연결되지 않았습니다."
  echo "  1. Android 폰을 USB로 연결하세요"
  echo "  2. USB 디버깅을 활성화하세요"
  echo "  3. adb devices 명령으로 확인하세요"
  exit 1
fi

DEVICE_ID=$(adb devices | grep "device$" | head -1 | cut -f1)
echo "연결된 디바이스: $DEVICE_ID"
echo ""

# 출력 디렉토리 생성
mkdir -p "$OUTPUT_DIR"

# 각 화면 캡처
captured=0
for entry in "${SCREENS[@]}"; do
  filename="${entry%%:*}"
  description="${entry#*:}"

  echo "────────────────────────────────────"
  echo "[$((captured + 1))/${#SCREENS[@]}] $description"
  echo "  파일: ${OUTPUT_DIR}/${filename}.png"
  echo ""
  echo "  → 앱에서 해당 화면으로 이동한 후 Enter를 누르세요."
  echo "  → 건너뛰려면 's'를 입력하세요."
  read -r input

  if [ "$input" = "s" ] || [ "$input" = "S" ]; then
    echo "  건너뜀."
    echo ""
    continue
  fi

  # 스크린샷 캡처
  adb shell screencap -p "$DEVICE_TEMP"
  adb pull "$DEVICE_TEMP" "${OUTPUT_DIR}/${filename}.png" > /dev/null 2>&1
  adb shell rm "$DEVICE_TEMP"

  # 이미지 리사이즈 (macOS sips 사용)
  if command -v sips &> /dev/null; then
    current_width=$(sips -g pixelWidth "${OUTPUT_DIR}/${filename}.png" | tail -1 | awk '{print $2}')
    if [ "$current_width" -gt "$MAX_WIDTH" ]; then
      sips --resampleWidth "$MAX_WIDTH" "${OUTPUT_DIR}/${filename}.png" --out "${OUTPUT_DIR}/${filename}.png" > /dev/null 2>&1
    fi
  fi

  size=$(du -h "${OUTPUT_DIR}/${filename}.png" | cut -f1)
  echo "  캡처 완료: ${filename}.png ($size)"
  echo ""
  captured=$((captured + 1))
done

echo "=== 캡처 완료 ==="
echo ""
echo "캡처된 파일 ($captured/${#SCREENS[@]}):"
ls -lh "$OUTPUT_DIR"/*.png 2>/dev/null || echo "  (캡처된 파일 없음)"
echo ""
echo "크기가 500KB를 초과하는 파일:"
find "$OUTPUT_DIR" -name "*.png" -size +500k -exec ls -lh {} \; 2>/dev/null || echo "  (없음 — 양호)"
