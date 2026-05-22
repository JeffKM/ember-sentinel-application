#!/bin/bash
# convert-demos.sh — MP4 원본을 GIF로 일괄 변환
#
# 사용법:
#   cd docs/demos
#   chmod +x convert-demos.sh
#   ./convert-demos.sh                    # 기본 변환
#   ./convert-demos.sh --trim 2 10        # 시작 2초, 10초 구간 트리밍
#   ./convert-demos.sh --gifski           # gifski 사용 (고품질)
#   ./convert-demos.sh --width 240        # 폭 240px
#   ./convert-demos.sh --fps 10           # 10fps
#
# 사전 요구사항: brew install ffmpeg gifski(선택)

set -euo pipefail

# ─── 기본 설정 ───
DEMOS=("fire-alert" "cctv-live" "recording-playback")
WIDTH=300
FPS=15
TRIM_START=""
TRIM_DURATION=""
USE_GIFSKI=false
MAX_GIF_SIZE=5  # MB

# ─── CLI 옵션 파싱 ───
while [[ $# -gt 0 ]]; do
  case $1 in
    --trim)
      TRIM_START="$2"
      TRIM_DURATION="$3"
      shift 3
      ;;
    --width)
      WIDTH="$2"
      shift 2
      ;;
    --fps)
      FPS="$2"
      shift 2
      ;;
    --gifski)
      USE_GIFSKI=true
      shift
      ;;
    --help|-h)
      echo "사용법: ./convert-demos.sh [옵션]"
      echo "  --trim START DURATION   트리밍 (시작초, 구간초)"
      echo "  --width N               GIF 폭 (기본: 300)"
      echo "  --fps N                 프레임레이트 (기본: 15)"
      echo "  --gifski                gifski 사용 (고품질, 작은 크기)"
      exit 0
      ;;
    *)
      echo "알 수 없는 옵션: $1"
      exit 1
      ;;
  esac
done

echo "=== Ember Sentinel 데모 GIF 변환 ==="
echo "  설정: ${WIDTH}px, ${FPS}fps"
if [ -n "$TRIM_START" ]; then
  echo "  트리밍: ${TRIM_START}초부터 ${TRIM_DURATION}초 구간"
fi
if $USE_GIFSKI; then
  echo "  엔진: gifski (고품질)"
else
  echo "  엔진: ffmpeg"
fi
echo ""

# 의존성 확인
if ! command -v ffmpeg &> /dev/null; then
  echo "오류: ffmpeg가 설치되지 않았습니다."
  echo "  brew install ffmpeg"
  exit 1
fi

if $USE_GIFSKI && ! command -v gifski &> /dev/null; then
  echo "오류: gifski가 설치되지 않았습니다."
  echo "  brew install gifski"
  exit 1
fi

converted=0
for name in "${DEMOS[@]}"; do
  input="${name}-raw.mp4"
  output="${name}-demo.gif"
  trimmed="${name}-trimmed.mp4"

  if [ ! -f "$input" ]; then
    echo "건너뜀: $input 파일 없음"
    echo "  → scrcpy --record ${input} 으로 먼저 녹화하세요"
    echo ""
    continue
  fi

  echo "변환 중: $input → $output"

  # 트리밍 (옵션)
  source_file="$input"
  if [ -n "$TRIM_START" ]; then
    echo "  트리밍: -ss ${TRIM_START} -t ${TRIM_DURATION}"
    ffmpeg -i "$input" -ss "$TRIM_START" -t "$TRIM_DURATION" \
      -c copy "$trimmed" -y -loglevel warning
    source_file="$trimmed"
  fi

  if $USE_GIFSKI; then
    # gifski 방식: 프레임 추출 → gifski 변환
    frames_dir="/tmp/ember-frames-${name}"
    mkdir -p "$frames_dir"

    ffmpeg -i "$source_file" \
      -vf "fps=${FPS},scale=${WIDTH}:-1" \
      "${frames_dir}/frame%04d.png" -y -loglevel warning

    gifski --fps "$FPS" --width "$WIDTH" \
      -o "$output" "${frames_dir}"/frame*.png

    rm -rf "$frames_dir"
  else
    # ffmpeg 방식: palettegen + paletteuse
    ffmpeg -i "$source_file" \
      -vf "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      -loop 0 "$output" -y -loglevel warning
  fi

  # 트리밍 임시 파일 정리
  if [ -n "$TRIM_START" ] && [ -f "$trimmed" ]; then
    rm -f "$trimmed"
  fi

  # 크기 확인 및 경고
  size_bytes=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output" 2>/dev/null)
  size_mb=$(echo "scale=1; $size_bytes / 1048576" | bc)
  size_human=$(du -h "$output" | cut -f1)

  if (( $(echo "$size_mb > $MAX_GIF_SIZE" | bc -l) )); then
    echo "  완료: $output ($size_human) ⚠️  ${MAX_GIF_SIZE}MB 초과!"
    echo "  → --width 240 --fps 10 으로 줄여보세요"
  else
    echo "  완료: $output ($size_human)"
  fi

  echo ""
  converted=$((converted + 1))
done

echo "=== 변환 완료 ($converted/${#DEMOS[@]}) ==="
echo ""
echo "생성된 GIF 파일:"
ls -lh ./*-demo.gif 2>/dev/null || echo "  (아직 생성된 GIF 없음)"
