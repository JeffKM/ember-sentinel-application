#!/bin/bash
# convert-demos.sh — MP4 원본을 GIF로 일괄 변환
#
# 사용법:
#   cd docs/demos
#   chmod +x convert-demos.sh
#   ./convert-demos.sh
#
# 사전 요구사항: brew install ffmpeg

set -euo pipefail

DEMOS=("fire-alert" "cctv-live" "recording-playback")
WIDTH=300
FPS=15

echo "=== Ember Sentinel 데모 GIF 변환 ==="
echo ""

for name in "${DEMOS[@]}"; do
  input="${name}-raw.mp4"
  output="${name}-demo.gif"

  if [ -f "$input" ]; then
    echo "변환 중: $input → $output"
    ffmpeg -i "$input" \
      -vf "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      -loop 0 "$output" -y -loglevel warning
    size=$(du -h "$output" | cut -f1)
    echo "  완료: $output ($size)"
    echo ""
  else
    echo "  건너뜀: $input 파일 없음"
    echo "  → scrcpy --record ${input} 으로 먼저 녹화하세요"
    echo ""
  fi
done

echo "=== 변환 완료 ==="
echo ""
echo "생성된 GIF 파일:"
ls -lh ./*-demo.gif 2>/dev/null || echo "  (아직 생성된 GIF 없음)"
