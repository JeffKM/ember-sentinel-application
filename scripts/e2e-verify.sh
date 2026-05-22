#!/bin/bash
# e2e-verify.sh — Phase 15 크로스 레포 E2E 검증 헬퍼
#
# 사용법:
#   chmod +x scripts/e2e-verify.sh
#   ./scripts/e2e-verify.sh
#
# 서버 API를 직접 호출하여 E2E 검증 과정을 도와줍니다.

set -euo pipefail

API_BASE="http://***REMOVED_IP***:8080"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
  echo ""
  echo "════════════════════════════════════════"
  echo " $1"
  echo "════════════════════════════════════════"
}

print_ok() { echo -e "  ${GREEN}✓${NC} $1"; }
print_fail() { echo -e "  ${RED}✗${NC} $1"; }
print_info() { echo -e "  ${YELLOW}→${NC} $1"; }

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
get_token() {
  print_header "2. JWT 토큰 설정"
  echo ""
  echo "  앱에서 로그인 후 받은 accessToken(userToken)을 입력하세요."
  echo "  (또는 환경변수 ACCESS_TOKEN이 설정되어 있으면 자동 사용)"
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

  # 토큰 유효성 간단 확인
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
  response=$(curl -s "$API_BASE/room/list/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  echo ""
  read -r -p "  카메라를 등록할 ROOM_ID를 입력하세요: " ROOM_ID
}

# ─── 4. 카메라 디바이스 등록 ───
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
  else
    print_fail "카메라 등록 실패 (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  fi

  echo ""
  print_info "edge-IoT config.production.yaml에 다음 값을 설정하세요:"
  echo "  device:"
  echo "    uuid: \"$DEVICE_UUID\""
}

# ─── 5. 방 상세 확인 ───
verify_room() {
  print_header "5. 방 상세 확인 (카메라 등록 검증)"
  response=$(curl -s "$API_BASE/room/${ROOM_ID}/detail" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
}

# ─── 6. 수동 화재 이벤트 발행 (FCM 테스트) ───
fire_event_test() {
  print_header "6. 수동 화재 이벤트 발행 (T-066)"

  echo ""
  read -r -p "  디바이스 UUID를 입력하세요 (위에서 등록한 UUID): " test_uuid
  read -r -p "  디바이스 API Key를 입력하세요: " test_api_key

  if [ -z "$test_uuid" ] || [ -z "$test_api_key" ]; then
    print_fail "UUID 또는 API Key가 비어있습니다."
    return
  fi

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
    print_ok "화재 이벤트 발행 성공"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    echo ""
    print_info "Android 실기기에서 FCM 알림 수신을 확인하세요!"
  else
    print_fail "화재 이벤트 발행 실패 (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  fi
}

# ─── 7. S3 녹화 확인 ───
check_recording() {
  print_header "7. 녹화 영상 확인 (T-065)"

  echo ""
  read -r -p "  화재 이벤트 ID를 입력하세요: " fire_event_id

  if [ -z "$fire_event_id" ]; then
    print_fail "이벤트 ID가 비어있습니다."
    return
  fi

  response=$(curl -s -w "\n%{http_code}" \
    "$API_BASE/fire-event/${fire_event_id}/record" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    print_ok "녹화 조회 성공"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  else
    print_fail "녹화 조회 실패 (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  fi
}

# ─── 메인 메뉴 ───
main() {
  echo ""
  echo "╔══════════════════════════════════════════╗"
  echo "║  Ember Sentinel — E2E 검증 도구          ║"
  echo "║  Phase 15: T-063 ~ T-066                ║"
  echo "╚══════════════════════════════════════════╝"

  check_server
  get_token

  while true; do
    echo ""
    echo "────────────────────────────────────"
    echo "  메뉴:"
    echo "    1) 방 목록 조회"
    echo "    2) 카메라 디바이스 등록 (T-063)"
    echo "    3) 방 상세 확인"
    echo "    4) 수동 화재 이벤트 발행 (T-066)"
    echo "    5) 녹화 영상 확인 (T-065)"
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
      5) check_recording ;;
      q|Q) echo "종료합니다."; exit 0 ;;
      *) echo "  잘못된 선택입니다." ;;
    esac
  done
}

main "$@"
