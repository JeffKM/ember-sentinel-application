# 데모 비디오 파일

이 디렉토리에 다음 파일을 추가하세요:

- `demo-cctv.mp4` — CCTV 실시간 피드 시뮬레이션 (5~10초, 루프 재생)
- `demo-fire-event.mp4` — 화재 감지 녹화 영상 (10~15초)

## ffmpeg로 생성하는 방법

```bash
# CCTV 피드 영상 (타임스탬프 포함)
ffmpeg -f lavfi -i color=c=0x1a1a1a:s=640x360:d=8 \
  -vf "drawtext=text='CAM-A101 LIVE':fontcolor=white:fontsize=18:x=10:y=10,\
       drawtext=text='%{localtime}':fontcolor=white:fontsize=14:x=10:y=340" \
  -c:v libx264 -t 8 demo-cctv.mp4

# 화재 이벤트 영상 (빨간색 오버레이)
ffmpeg -f lavfi -i color=c=0x1a1a1a:s=640x360:d=12 \
  -vf "drawtext=text='FIRE DETECTED':fontcolor=red:fontsize=24:x=(w-tw)/2:y=(h-th)/2" \
  -c:v libx264 -t 12 demo-fire-event.mp4
```
