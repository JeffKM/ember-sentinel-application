#!/bin/bash
# e2e-verify.sh — Phase 15 크로스 레포 E2E 검증 헬퍼
#
# 사용법:
#   chmod +x scripts/e2e-verify.sh
#   ./scripts/e2e-verify.sh
#
# 서버 API를 직접 호출하여 E2E 검증 과정을 도와줍니다.
# T-063 카메라 등록, T-064 스트리밍 검증, T-065 녹화 검증, T-066 FCM 검증

set -euo pipefail

API_BASE="http://***REMOVED_IP***:8080"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 검증 결과 카운터
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

print_header() {
  echo ""
  echo -e "${BOLD}════════════════════════════════════════${NC}"
  echo -e "${BOLD} $1${NC}"
  echo -e "${BOLD}════════════════════════════════════════${NC}"
}

print_ok() { echo -e "  ${GREEN}✓${NC} $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
print_fail() { echo -e "  ${RED}✗${NC} $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
print_skip() { echo -e "  ${YELLOW}○${NC} $1 (건너뜀)"; SKIP_COUNT=$((SKIP_COUNT + 1)); }
print_info() { echo -e "  ${YELLOW}→${NC} $1"; }
print_step() { echo -e "  ${CYAN}▸${NC} $1"; }

# ─── 1. 서버 헬스체크 ───
check_server() {
  print_header "1. 서버 헬스체크"
  if curl -s --connect-timeout 5 "$API_BASE" > /dev/null 2>&1; then
    print_ok "서버 응답 확인: $API_BASE"
  else
    print_fail "서버 접근 불가: $API_BASE"
    echo "  EC2 서버가 실행 중인지 확인하세요."
    exit 1
  fi
}

# ─── 2. JWT 토큰 입력 ───

# Google access token(ya29.xxx)을 서버 JWT로 자동 변환
convert_google_token() {
  local google_token="$1"
  print_info "Google access token 감지 → 서버 JWT 자동 변환 중..."

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/google" \
    -H "Content-Type: application/json" \
    -d "{\"accessToken\": \"${google_token}\"}")

  local http_code body
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    ACCESS_TOKEN=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || echo "")
    if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "None" ]; then
      print_ok "서버 JWT 발급 성공"
      return 0
    fi
  fi

  print_fail "Google 토큰 → JWT 변환 실패 (HTTP $http_code)"
  echo "$body" | python3 -m json.tool 2>/dev/null || echo "  $body"
  return 1
}

get_token() {
  print_header "2. JWT 토큰 설정"
  echo ""
  echo "  서버 JWT(eyJ...) 또는 Google access token(ya29.xxx) 모두 사용 가능합니다."
  echo "  Google 토큰 입력 시 서버 JWT로 자동 변환됩니다."
  echo "  (환경변수 ACCESS_TOKEN이 설정되어 있으면 자동 사용)"
  echo ""

  if [ -n "${ACCESS_TOKEN:-}" ]; then
    print_info "환경변수 ACCESS_TOKEN 사용"
  else
    read -r -p "  ACCESS_TOKEN: " ACCESS_TOKEN
    if [ -z "$ACCESS_TOKEN" ]; then
      print_fail "토큰이 비어있습니다."
      exit 1
    fi
  fi

  # Google access token 자동 감지 및 변환
  if [[ "$ACCESS_TOKEN" == ya29.* ]]; then
    convert_google_token "$ACCESS_TOKEN" || exit 1
  fi

  # 토큰 유효성 확인
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/user/info" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -1)

  if [ "$http_code" = "200" ]; then
    nickname=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('nickname',''))" 2>/dev/null || echo "?")
    print_ok "토큰 유효 (사용자: $nickname)"
  else
    print_fail "토큰 인증 실패 (HTTP $http_code)"
    echo "  새 토큰으로 다시 시도하세요."
    exit 1
  fi
}

# ─── 3. 방 목록 확인 ───
list_rooms() {
  print_header "3. 내 방(Room) 목록"
  response=$(curl -s "$API_BASE/room/list/me?page=0&size=10" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  echo ""

  # 방이 1개면 자동 선택
  room_count=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('totalElements',0))" 2>/dev/null || echo "0")
  if [ "$room_count" = "1" ]; then
    ROOM_ID=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['content'][0]['roomId'])" 2>/dev/null || echo "")
    if [ -n "$ROOM_ID" ]; then
      room_alias=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['content'][0].get('roomAlias',''))" 2>/dev/null || echo "")
      print_ok "방 자동 선택: ROOM_ID=$ROOM_ID ($room_alias)"
      return
    fi
  fi

  read -r -p "  카메라를 등록할 ROOM_ID를 입력하세요: " ROOM_ID
}

# ─── 4. 카메라 디바이스 등록 (T-063) ───
register_camera() {
  print_header "4. 카메라 디바이스 등록 (T-063)"

  DEVICE_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
  print_info "생성된 UUID: $DEVICE_UUID"

  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_BASE/room/${ROOM_ID}/camera-edge" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"deviceUuid\": \"${DEVICE_UUID}\",
      \"cameraEdgeAlias\": \"macOS-Webcam-Simulator\"
    }")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    print_ok "카메라 등록 성공"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"

    # 응답에서 API Key 캡처 (등록 시 한 번만 노출)
    DEVICE_API_KEY=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('apiKey',''))" 2>/dev/null || echo "")
    if [ -n "$DEVICE_API_KEY" ] && [ "$DEVICE_API_KEY" != "None" ]; then
      print_ok "디바이스 API Key 자동 저장됨 (이후 메뉴에서 자동 사용)"
    fi
  else
    print_fail "카메라 등록 실패 (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  fi

  echo ""
  print_info "edge-IoT config.production.yaml에 다음 값을 설정하세요:"
  echo "  device:"
  echo "    uuid: \"$DEVICE_UUID\""
  if [ -n "${DEVICE_API_KEY:-}" ] && [ "$DEVICE_API_KEY" != "None" ]; then
    echo "    api_key: \"$DEVICE_API_KEY\""
  fi
}

# ─── 5. 방 상세 확인 ───
verify_room() {
  print_header "5. 방 상세 확인 (카메라 등록 검증)"
  response=$(curl -s "$API_BASE/room/${ROOM_ID}/detail" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
}

# ─── 디바이스 정보 자동 조회 ───
EDGE_IOT_CONFIG="$(dirname "$0")/../../../edge-IoT/config.production.yaml"

# 방 상세에서 첫 번째 카메라 UUID 자동 추출
auto_detect_device_uuid() {
  if [ -n "${ROOM_ID:-}" ]; then
    local room_resp
    room_resp=$(curl -s "$API_BASE/room/${ROOM_ID}/detail" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    local uuid
    uuid=$(echo "$room_resp" | python3 -c "
import sys, json
data = json.load(sys.stdin)
cameras = data.get('cameras', [])
if cameras:
    print(cameras[0].get('deviceUuid', ''))
" 2>/dev/null || echo "")
    if [ -n "$uuid" ] && [ "$uuid" != "None" ]; then
      echo "$uuid"
      return
    fi
  fi
  echo ""
}

# edge-IoT config.production.yaml에서 API key 자동 추출
auto_detect_api_key() {
  local config_path="$EDGE_IOT_CONFIG"
  # 프로젝트 루트 기준 상대경로 시도
  if [ ! -f "$config_path" ]; then
    config_path="/Users/$(whoami)/Projects/edge-IoT/config.production.yaml"
  fi
  if [ -f "$config_path" ]; then
    local key
    key=$(python3 -c "
import yaml, sys
with open('$config_path') as f:
    cfg = yaml.safe_load(f)
print(cfg.get('device', {}).get('api_key', ''))
" 2>/dev/null || grep 'api_key:' "$config_path" | head -1 | sed 's/.*api_key:[[:space:]]*//' | tr -d '"' || echo "")
    if [ -n "$key" ] && [ "$key" != "None" ]; then
      echo "$key"
      return
    fi
  fi
  echo ""
}

# ─── 6. 화재 이벤트 발행 + FCM 검증 (T-066) ───
fire_event_test() {
  print_header "6. 화재 이벤트 발행 + FCM 푸시 검증 (T-066)"

  # UUID + API Key는 쌍으로 일치해야 함
  # 우선순위: 세션(카메라 등록 시 저장) → edge-IoT config → 수동 입력
  local test_uuid=""
  local test_api_key=""

  if [ -n "${DEVICE_UUID:-}" ] && [ -n "${DEVICE_API_KEY:-}" ] && [ "$DEVICE_API_KEY" != "None" ]; then
    # 세션에서 등록한 UUID + API Key 쌍 사용
    test_uuid="$DEVICE_UUID"
    test_api_key="$DEVICE_API_KEY"
    print_ok "세션 디바이스 사용: UUID=$test_uuid"
    print_ok "세션 API Key 사용"
  else
    # edge-IoT config에서 UUID + API Key 쌍 읽기
    local config_uuid=""
    local config_api_key=""
    config_api_key=$(auto_detect_api_key)

    local config_path="$EDGE_IOT_CONFIG"
    if [ ! -f "$config_path" ]; then
      config_path="/Users/$(whoami)/Projects/edge-IoT/config.production.yaml"
    fi
    if [ -f "$config_path" ]; then
      config_uuid=$(python3 -c "
import yaml
with open('$config_path') as f:
    cfg = yaml.safe_load(f)
print(cfg.get('device', {}).get('uuid', ''))
" 2>/dev/null || echo "")
    fi

    if [ -n "$config_uuid" ] && [ "$config_uuid" != "None" ] && [ -n "$config_api_key" ]; then
      test_uuid="$config_uuid"
      test_api_key="$config_api_key"
      print_ok "edge-IoT config에서 자동 감지: UUID=$test_uuid"
      print_ok "edge-IoT config에서 API Key 자동 감지"
    else
      # 수동 입력
      read -r -p "  디바이스 UUID를 입력하세요: " test_uuid
      read -r -p "  디바이스 API Key를 입력하세요: " test_api_key
    fi
  fi

  if [ -z "$test_uuid" ] || [ -z "$test_api_key" ]; then
    print_fail "UUID 또는 API Key가 비어있습니다."
    return
  fi

  print_step "화재 이벤트 발행 중..."
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_BASE/embedded/fire-event/publish" \
    -H "Content-Type: application/json" \
    -H "X-Device-API-Key: $test_api_key" \
    -d "{
      \"deviceUuid\": \"${test_uuid}\",
      \"detectionType\": \"FIRE\",
      \"riskRank\": 3
    }")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    print_ok "화재 이벤트 발행 성공 (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"

    # 화재 이벤트 ID 추출
    FIRE_EVENT_ID=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# 응답 구조에 따라 fireEventId 추출
if isinstance(data, dict):
    fid = data.get('fireEventId') or data.get('id') or data.get('data', {}).get('fireEventId', '')
    print(fid)
" 2>/dev/null || echo "")

    if [ -n "$FIRE_EVENT_ID" ] && [ "$FIRE_EVENT_ID" != "None" ] && [ "$FIRE_EVENT_ID" != "" ]; then
      print_info "화재 이벤트 ID: $FIRE_EVENT_ID"
    fi

    echo ""
    echo -e "  ${CYAN}── FCM 검증 체크리스트 ──${NC}"
    echo "  Android 실기기에서 다음 항목을 확인하세요:"
    echo ""
    echo "    □ 포그라운드: 커스텀 배너 알림 표시"
    echo "    □ 백그라운드: 시스템 알림 트레이에 표시"
    echo "    □ 알림 탭 → FireAlertDetail 화면 자동 이동"
    echo "    □ Cold start (앱 종료 상태) → 알림 탭 → 앱 실행 + 화면 이동"
    echo ""
    read -r -p "  FCM 알림이 수신되었나요? (y/n): " fcm_received
    if [ "$(echo "$fcm_received" | tr '[:upper:]' '[:lower:]')" = "y" ]; then
      print_ok "FCM 푸시 알림 수신 확인 (T-066 검증 완료)"
    else
      print_fail "FCM 알림 미수신 — 아래 확인 필요:"
      echo "    1. 앱에서 알림 권한 허용됨?"
      echo "    2. 앱 로그인 후 FCM 토큰이 서버에 등록됨?"
      echo "    3. google-services.json이 올바른 프로젝트?"
      echo "    4. 네트워크 연결 정상?"
    fi
  else
    print_fail "화재 이벤트 발행 실패 (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  fi
}

# ─── 7. 실시간 스트리밍 검증 (T-064) ───
verify_streaming() {
  print_header "7. 실시간 스트리밍 E2E 검증 (T-064)"

  echo ""
  if [ -n "${FIRE_EVENT_ID:-}" ] && [ "$FIRE_EVENT_ID" != "None" ]; then
    print_info "현재 세션 화재 이벤트 ID: $FIRE_EVENT_ID"
    read -r -p "  이 ID를 사용하시겠습니까? (Y/n): " use_current
    if [ "$(echo "$use_current" | tr '[:upper:]' '[:lower:]')" = "n" ]; then
      read -r -p "  화재 이벤트 ID: " fire_id
    else
      fire_id="$FIRE_EVENT_ID"
    fi
  else
    read -r -p "  화재 이벤트 ID를 입력하세요: " fire_id
  fi

  if [ -z "$fire_id" ]; then
    print_fail "이벤트 ID가 비어있습니다."
    return
  fi

  # 7-1. 스트리밍 구독 토큰 발급
  print_step "스트리밍 구독 토큰 발급 중..."
  response=$(curl -s -w "\n%{http_code}" \
    "$API_BASE/fire-event/${fire_id}/stream/subscribe" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    print_ok "스트리밍 토큰 발급 성공"

    # 토큰과 URL 추출
    stream_token=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('token', ''))
" 2>/dev/null || echo "")

    stream_url=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('url', ''))
" 2>/dev/null || echo "")

    if [ -n "$stream_token" ] && [ "$stream_token" != "None" ]; then
      token_preview="${stream_token:0:20}..."
      print_ok "LiveKit 토큰 발급됨 ($token_preview)"
    else
      print_fail "토큰이 비어있음"
    fi

    if [ -n "$stream_url" ] && [ "$stream_url" != "None" ] && [ "$stream_url" != "" ]; then
      print_ok "LiveKit URL: $stream_url"

      # LiveKit Cloud WebSocket 연결 테스트
      print_step "LiveKit Cloud 접근성 확인 중..."
      # WSS URL에서 호스트 추출 후 HTTPS로 접근 테스트
      livekit_host=$(echo "$stream_url" | sed 's|wss://||' | sed 's|/.*||')
      if curl -s --connect-timeout 5 "https://$livekit_host" > /dev/null 2>&1; then
        print_ok "LiveKit Cloud 접근 가능: $livekit_host"
      else
        print_info "LiveKit Cloud HTTPS 응답 없음 (WebSocket 전용일 수 있음)"
      fi
    else
      print_info "URL 미포함 (앱에서 환경변수로 설정)"
    fi

    echo ""
    echo -e "  ${CYAN}── 스트리밍 검증 체크리스트 ──${NC}"
    echo "  Android 실기기에서 다음 항목을 확인하세요:"
    echo ""
    echo "    □ CCTVLiveScreen 진입 시 연결 상태 표시 (fetching_token → connecting)"
    echo "    □ LIVE 배지 초록색 = WebRTC 스트리밍 수신 중"
    echo "    □ 시뮬레이터의 카메라 영상이 실시간으로 표시"
    echo "    □ 시뮬레이터 중단 시 자동 재연결 시도 (최대 3회)"
    echo ""
    read -r -p "  실시간 스트리밍이 정상 수신되었나요? (y/n/s=건너뜀): " stream_ok
    case "$(echo "$stream_ok" | tr '[:upper:]' '[:lower:]')" in
      y) print_ok "실시간 스트리밍 수신 확인 (T-064 검증 완료)" ;;
      n)
        print_fail "스트리밍 수신 실패 — 아래 확인 필요:"
        echo "    1. edge-IoT 시뮬레이터가 실행 중인가?"
        echo "    2. 시뮬레이터가 LiveKit에 연결되었는가?"
        echo "    3. 시뮬레이터의 config에 동일한 LiveKit URL이 설정되어 있는가?"
        echo "    4. 앱의 EXPO_PUBLIC_LIVEKIT_URL 환경변수가 올바른가?"
        ;;
      *) print_skip "스트리밍 검증" ;;
    esac
  else
    print_fail "스트리밍 토큰 발급 실패 (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"

    if [ "$http_code" = "404" ]; then
      print_info "해당 화재 이벤트에 연결된 스트림이 없습니다."
      print_info "edge-IoT 시뮬레이터를 먼저 실행하여 스트리밍을 시작하세요."
    fi
  fi
}

# ─── 8. 녹화 영상 검증 (T-065) ───
check_recording() {
  print_header "8. Egress 녹화 → S3 → Presigned URL 검증 (T-065)"

  echo ""
  if [ -n "${FIRE_EVENT_ID:-}" ] && [ "$FIRE_EVENT_ID" != "None" ]; then
    print_info "현재 세션 화재 이벤트 ID: $FIRE_EVENT_ID"
    read -r -p "  이 ID를 사용하시겠습니까? (Y/n): " use_current
    if [ "$(echo "$use_current" | tr '[:upper:]' '[:lower:]')" = "n" ]; then
      read -r -p "  화재 이벤트 ID: " fire_event_id
    else
      fire_event_id="$FIRE_EVENT_ID"
    fi
  else
    read -r -p "  화재 이벤트 ID를 입력하세요: " fire_event_id
  fi

  if [ -z "$fire_event_id" ]; then
    print_fail "이벤트 ID가 비어있습니다."
    return
  fi

  # 8-1. 녹화 URL 조회
  print_step "녹화 영상 URL 조회 중..."
  response=$(curl -s -w "\n%{http_code}" \
    "$API_BASE/fire-event/${fire_event_id}/record?roomId=${ROOM_ID:-1}" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    print_ok "녹화 조회 성공"

    # Presigned URL 추출
    record_url=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('recordUrl', ''))
" 2>/dev/null || echo "")

    if [ -n "$record_url" ] && [ "$record_url" != "None" ] && [ "$record_url" != "" ]; then
      # URL 미리보기 (보안상 시그니처 부분 숨김)
      url_preview=$(echo "$record_url" | sed 's/\(X-Amz-Signature=\)[^&]*/\1***/')
      print_ok "S3 Presigned URL 발급됨"
      echo "    $url_preview"

      # 8-2. Presigned URL 유효성 검증 (HEAD 요청)
      print_step "S3 파일 접근성 검증 중 (HEAD 요청)..."
      head_response=$(curl -s -o /dev/null -w "%{http_code}|%{content_type}|%{size_download}" \
        --connect-timeout 10 -I "$record_url" 2>/dev/null || echo "000||0")

      head_code=$(echo "$head_response" | cut -d'|' -f1)
      content_type=$(echo "$head_response" | cut -d'|' -f2)

      if [ "$head_code" = "200" ]; then
        print_ok "S3 파일 접근 가능 (HTTP $head_code)"

        # Content-Type 확인
        if echo "$content_type" | grep -qi "video\|mp4\|webm\|octet-stream"; then
          print_ok "Content-Type: $content_type (영상 파일)"
        elif [ -n "$content_type" ]; then
          print_info "Content-Type: $content_type"
        fi

        # Content-Length 확인 (HEAD 응답 전체에서 추출)
        content_length=$(curl -sI --connect-timeout 10 "$record_url" 2>/dev/null | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
        if [ -n "$content_length" ] && [ "$content_length" -gt 0 ] 2>/dev/null; then
          size_mb=$(echo "scale=2; $content_length / 1048576" | bc 2>/dev/null || echo "?")
          print_ok "파일 크기: ${size_mb}MB ($content_length bytes)"
        fi

        echo ""
        echo -e "  ${CYAN}── 녹화 재생 검증 체크리스트 ──${NC}"
        echo "  Android 실기기에서 다음 항목을 확인하세요:"
        echo ""
        echo "    □ 화재 이벤트 이력 → 해당 이벤트 선택"
        echo "    □ FireEventVideoScreen에서 영상 재생 시작"
        echo "    □ 영상 재생 컨트롤(재생/일시정지) 동작"
        echo "    □ 영상 내용이 시뮬레이터 촬영 장면과 일치"
        echo ""
        read -r -p "  녹화 영상이 앱에서 정상 재생되었나요? (y/n/s=건너뜀): " play_ok
        case "$(echo "$play_ok" | tr '[:upper:]' '[:lower:]')" in
          y) print_ok "녹화 영상 재생 확인 (T-065 검증 완료)" ;;
          n)
            print_fail "영상 재생 실패 — 아래 확인 필요:"
            echo "    1. expo-video가 S3 URL을 지원하는 형식인가?"
            echo "    2. Presigned URL이 만료되지 않았는가? (5분 유효)"
            echo "    3. S3 CORS 설정이 올바른가?"
            ;;
          *) print_skip "녹화 재생 검증" ;;
        esac
      elif [ "$head_code" = "403" ]; then
        print_fail "S3 접근 거부 (HTTP 403) — Presigned URL 만료 가능"
        print_info "서버에서 새 URL을 재발급 받으세요."
      else
        print_fail "S3 파일 접근 실패 (HTTP $head_code)"
      fi
    else
      print_fail "녹화 URL이 비어있음 — Egress 녹화가 아직 완료되지 않았을 수 있습니다."
      print_info "LiveKit Egress가 S3에 저장을 완료할 때까지 대기하세요."
      print_info "서버 로그에서 'egress_ended' Webhook 수신 여부를 확인하세요."
    fi
  else
    print_fail "녹화 조회 실패 (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"

    if [ "$http_code" = "404" ]; then
      print_info "해당 화재 이벤트에 녹화 기록이 없습니다."
    fi
  fi
}

# ─── 9. 전체 E2E 플로우 (T-064 + T-065 + T-066 통합) ───
full_e2e_flow() {
  print_header "9. 전체 E2E 플로우 검증 (T-064 + T-065 + T-066)"

  echo ""
  echo "  이 테스트는 아래 전체 흐름을 순서대로 검증합니다:"
  echo ""
  echo "    1. 화재 이벤트 발행 → FCM 푸시 알림 수신 (T-066)"
  echo "    2. 스트리밍 토큰 발급 → LiveKit 영상 수신 (T-064)"
  echo "    3. 녹화 종료 → S3 Presigned URL → 영상 재생 (T-065)"
  echo ""
  echo "  사전 요구사항:"
  echo "    - edge-IoT 시뮬레이터 실행 중 (또는 수동 API 사용)"
  echo "    - Android 실기기에 APK 설치 + 로그인 완료"
  echo ""
  read -r -p "  계속하시겠습니까? (y/n): " proceed
  if [ "$(echo "$proceed" | tr '[:upper:]' '[:lower:]')" != "y" ]; then
    print_info "취소됨"
    return
  fi

  echo ""
  echo -e "${BOLD}── Step 1/3: 화재 이벤트 발행 + FCM 검증 (T-066) ──${NC}"
  fire_event_test

  echo ""
  echo -e "${BOLD}── Step 2/3: 실시간 스트리밍 검증 (T-064) ──${NC}"
  echo ""
  print_info "시뮬레이터가 스트리밍을 시작할 때까지 잠시 대기..."
  read -r -p "  준비되면 Enter를 눌러주세요: "
  verify_streaming

  echo ""
  echo -e "${BOLD}── Step 3/3: 녹화 영상 검증 (T-065) ──${NC}"
  echo ""
  print_info "스트리밍 종료 + Egress 완료까지 대기 후 진행하세요."
  read -r -p "  준비되면 Enter를 눌러주세요: "
  check_recording

  # 최종 결과 리포트
  print_header "E2E 검증 최종 결과"
  echo ""
  echo -e "  ${GREEN}통과: ${PASS_COUNT}${NC}  |  ${RED}실패: ${FAIL_COUNT}${NC}  |  ${YELLOW}건너뜀: ${SKIP_COUNT}${NC}"
  echo ""

  if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}✓ 전체 E2E 플로우 검증 완료!${NC}"
    echo ""
    echo "  검증된 항목:"
    echo "    ✓ 화재 이벤트 발행 → 서버 처리"
    echo "    ✓ FCM 푸시 알림 → 실기기 수신"
    echo "    ✓ LiveKit 스트리밍 토큰 발급"
    echo "    ✓ 실시간 WebRTC 영상 수신"
    echo "    ✓ S3 Presigned URL 발급 + 유효성"
    echo "    ✓ 녹화 영상 앱 재생"
  else
    echo -e "  ${YELLOW}일부 항목에서 문제가 발견되었습니다.${NC}"
    echo "  위의 실패 항목별 대응 가이드를 참고하세요."
  fi
  echo ""
}

# ─── 메인 메뉴 ───
main() {
  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║  Ember Sentinel — E2E 검증 도구 v2.0        ║"
  echo "║  Phase 15: T-063 ~ T-066                    ║"
  echo "╚══════════════════════════════════════════════╝"

  check_server
  get_token

  while true; do
    echo ""
    echo "────────────────────────────────────"
    echo "  메뉴:"
    echo "    1) 방 목록 조회"
    echo "    2) 카메라 디바이스 등록 (T-063)"
    echo "    3) 방 상세 확인"
    echo "    4) 화재 이벤트 발행 + FCM 검증 (T-066)"
    echo "    5) 실시간 스트리밍 검증 (T-064)"
    echo "    6) 녹화 영상 검증 (T-065)"
    echo "    7) 전체 E2E 플로우 (T-064+T-065+T-066)"
    echo "    q) 종료"
    echo ""
    read -r -p "  선택: " choice

    case $choice in
      1) list_rooms ;;
      2) register_camera ;;
      3)
        if [ -z "${ROOM_ID:-}" ]; then
          read -r -p "  ROOM_ID: " ROOM_ID
        fi
        verify_room
        ;;
      4) fire_event_test ;;
      5) verify_streaming ;;
      6) check_recording ;;
      7) full_e2e_flow ;;
      q|Q) echo "종료합니다."; exit 0 ;;
      *) echo "  잘못된 선택입니다." ;;
    esac
  done
}

main "$@"
