# 데모 GIF/영상 캡처 가이드

> 실기기에서 E2E 동작을 GIF로 캡처하여 README에 삽입하기 위한 가이드

---

## 필요 도구 설치

```bash
# Android 화면 미러링 (scrcpy)
brew install scrcpy

# 영상 변환 도구
brew install ffmpeg

# 고품질 GIF 생성 (선택)
brew install gifski
```

---

## GIF 캡처 대상 (3개)

### 1. 화재 감지 → 푸시 알림 (`fire-alert-demo.gif`)

**시나리오**: 엣지 시뮬레이터에서 화재 감지 → 실기기 FCM 알림 수신 → 알림 탭 → 화재 상세 화면

**녹화 시간**: 8~10초

```bash
# 1. scrcpy로 Android 미러링 + 녹화
scrcpy --record fire-alert-raw.mp4

# 2. 시뮬레이터에서 화재 감지 트리거
# (macOS 터미널에서) python simulator.py --config config.production.yaml

# 3. 앱에서 알림 수신 확인 후 녹화 중지 (Ctrl+C)
```

### 2. 실시간 CCTV 스트리밍 (`cctv-live-demo.gif`)

**시나리오**: 홈 화면 → 방 상세 → CCTV Live → LiveKit WebRTC 실시간 영상 확인

**녹화 시간**: 10~15초

```bash
scrcpy --record cctv-live-raw.mp4
# 앱에서 CCTV Live 화면 진입 후 실시간 영상 확인
```

### 3. 녹화 영상 재생 (`recording-playback-demo.gif`)

**시나리오**: 화재 이벤트 이력 → 녹화 영상 선택 → S3 Presigned URL 영상 재생

**녹화 시간**: 8~10초

```bash
scrcpy --record recording-playback-raw.mp4
# 앱에서 화재 이력 → 녹화 영상 재생
```

---

## MP4 → GIF 변환

### 방법 1: ffmpeg (기본)

```bash
# 트리밍 (시작 2초, 10초 구간)
ffmpeg -i fire-alert-raw.mp4 -ss 2 -t 10 -c copy fire-alert-trimmed.mp4

# GIF 변환 (폭 300px, 15fps)
ffmpeg -i fire-alert-trimmed.mp4 \
  -vf "fps=15,scale=300:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 fire-alert-demo.gif
```

### 방법 2: gifski (고품질, 더 작은 파일)

```bash
# 프레임 추출
ffmpeg -i fire-alert-trimmed.mp4 -vf "fps=15,scale=300:-1" frames/frame%04d.png

# gifski로 GIF 생성
gifski --fps 15 --width 300 -o fire-alert-demo.gif frames/frame*.png
```

---

## 일괄 변환 스크립트

```bash
#!/bin/bash
# convert-demos.sh — MP4 원본을 GIF로 일괄 변환

DEMOS=("fire-alert" "cctv-live" "recording-playback")
WIDTH=300
FPS=15

for name in "${DEMOS[@]}"; do
  input="${name}-raw.mp4"
  output="${name}-demo.gif"

  if [ -f "$input" ]; then
    echo "변환 중: $input → $output"
    ffmpeg -i "$input" \
      -vf "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      -loop 0 "$output" -y
    echo "완료: $output ($(du -h "$output" | cut -f1))"
  else
    echo "건너뜀: $input 파일 없음"
  fi
done
```

---

## 스크린샷 캡처 (T-067)

9개 화면 스크린샷을 실기기에서 캡처:

```bash
# ADB 스크린샷
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png docs/screenshots/

# 또는 scrcpy에서 단축키
# Ctrl+S: 스크린샷 저장 (기본 ~/scrcpy/)
```

### 캡처 대상 화면

| 파일명                 | 화면              |
| ---------------------- | ----------------- |
| `01-splash.png`        | 스플래시 화면     |
| `02-login.png`         | 로그인 화면       |
| `03-home.png`          | 홈 화면 (방 목록) |
| `04-room-detail.png`   | 방 상세           |
| `05-fire-alert.png`    | 화재 경보 상세    |
| `06-cctv-live.png`     | CCTV 실시간 영상  |
| `07-fire-location.png` | 화재 위치 평면도  |
| `08-fire-history.png`  | 화재 이벤트 이력  |
| `09-recording.png`     | 녹화 영상 재생    |

---

## 파일 크기 제한

GitHub README 이미지 로딩 성능을 위해:

- GIF: 5MB 이하 권장
- 스크린샷 PNG: 500KB 이하 권장

```bash
# 파일 크기 확인
du -h docs/demos/*.gif docs/screenshots/*.png
```
