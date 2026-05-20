# Ember Sentinel — 개발 로드맵

> **기준 문서**: [docs/PRD.md](./PRD.md)
> **최종 갱신**: 2026-05-20
> **목표**: 면접 시연 가능한 수준으로 전체 시스템 개선

---

## 진행 상황 요약

| Phase | 이름 | 상태 | 진행률 |
|-------|------|------|--------|
| Phase 1 | 로컬 개발 환경 구축 (백엔드) | 🔲 대기 | 0/6 |
| Phase 2 | 모바일 앱 데모 모드 | 🔲 대기 | 0/4 |
| Phase 3 | 엣지 IoT 시뮬레이터 | 🔲 대기 | 0/3 |
| Phase 4 | 백엔드 보안 강화 | 🔲 대기 | 0/3 |
| Phase 5 | 백엔드 테스트 강화 | 🔲 대기 | 0/4 |
| Phase 6 | 모바일 앱 코드 품질 | 🔲 대기 | 0/4 |
| Phase 7 | 엣지 IoT 코드 품질 | 🔲 대기 | 0/3 |
| Phase 8 | 아키텍처 문서화 | 🔲 대기 | 0/7 |
| Phase 9 | 인프라 이전 및 비용 최적화 | 🔲 대기 | 0/3 |
| Phase 10 | AI 모델 시각화 및 실험 | 🔲 대기 | 0/4 |
| Phase 11 | 모니터링 및 CI/CD | 🔲 대기 | 0/6 |
| Phase 12 | 문서 및 README 통일 | 🔲 대기 | 0/3 |

---

## Phase 1: 로컬 개발 환경 구축 (백엔드) `P0`

> **목표**: `docker compose up` 한 번으로 백엔드 전체 스택 기동
> **대상 레포**: `ember-sentinel-server`
> **선행 조건**: 없음

모든 후속 Phase의 기반이 되는 핵심 작업. 면접 시연의 전제 조건.

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-001 | Docker Compose 파일 작성 (PostgreSQL, Redis, LiveKit, MinIO, API 서버) | 🔲 | 전체 Phase의 기반 |
| T-002 | `application-local.yml` 프로필 추가 (로컬 Docker 환경용) | 🔲 | T-001 이후 |
| T-003 | DB 초기화 스크립트 (`init.sql` — 테이블 + 시드 데이터) | 🔲 | T-001 이후 |
| T-004 | LiveKit 로컬 설정 (`livekit-local.yaml`) | 🔲 | T-001 이후 |
| T-005 | MinIO 버킷 자동 생성 스크립트 | 🔲 | T-001 이후 |
| T-006 | `.env.example` + 로컬 실행 가이드 문서 | 🔲 | T-001~005 완료 후 |

**완료 기준**: `docker compose up -d` 후 `curl localhost:8080/actuator/health` → `UP` 응답

---

## Phase 2: 모바일 앱 데모 모드 `P0`

> **목표**: 서버 연결 없이 전체 화면 흐름 시연 가능
> **대상 레포**: `ember-sentinel`
> **선행 조건**: 없음 (Phase 1과 병렬 진행 가능)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-007 | 데모 데이터 세트 확충 (건물 3, 방 5, 카메라 8, 화재 이벤트 10) | 🔲 | |
| T-008 | API base URL 환경 변수화 (`.env` 분리) | 🔲 | |
| T-009 | CCTV 화면 데모 영상 (로컬 번들 MP4) | 🔲 | |
| T-010 | 화재 이벤트 수동 트리거 (개발자 메뉴 시뮬레이션 버튼) | 🔲 | T-007 이후 |

**완료 기준**: 서버 미연결 상태에서 9개 화면 모두 탐색 가능

---

## Phase 3: 엣지 IoT 시뮬레이터 `P0`

> **목표**: 라즈베리파이 없이 노트북에서 화재 감지 시뮬레이션
> **대상 레포**: `edge-IoT`
> **선행 조건**: Phase 1 (API 서버 기동 필요)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-012 | 설정 파일 외부화 (`config.yaml`) | 🔲 | 우선 진행 |
| T-013 | BLE 모킹 (`--no-ble` 플래그) | 🔲 | T-012 이후 |
| T-011 | 엣지 시뮬레이터 스크립트 (`simulator.py`) | 🔲 | T-012, Phase 1 이후 |

**완료 기준**: `python simulator.py --no-ble --video sample.mp4` → API 서버에 화재 이벤트 발행 성공

---

## Phase 4: 백엔드 보안 강화 `P1`

> **목표**: 면접 보안 질문 대비, 취약점 해소
> **대상 레포**: `ember-sentinel-server`
> **선행 조건**: 없음 (Phase 1 완료 시 로컬에서 검증 가능)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-014 | 엣지 디바이스 API Key 인증 (`X-Device-API-Key` 헤더) | 🔲 | |
| T-015 | Rate Limiting 적용 (화재 이벤트 발행 1분 1회) | 🔲 | T-014 이후 |
| T-016 | JWT Refresh Token 회전 (사용 시 재발급 + 이전 무효화) | 🔲 | |

**완료 기준**: 인증 없는 `/embedded/fire-event/publish` 호출 시 401 응답

---

## Phase 5: 백엔드 테스트 강화 `P1`

> **목표**: 핵심 도메인 테스트 커버리지 70% 이상
> **대상 레포**: `ember-sentinel-server`
> **선행 조건**: Phase 1 (Testcontainers용 Docker 필요)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-017 | 핵심 도메인 단위 테스트 (FireEvent, Auth, Room) | 🔲 | |
| T-018 | 통합 테스트 (`@SpringBootTest` + Testcontainers) | 🔲 | Phase 1 이후 |
| T-019 | API 엔드포인트 테스트 (MockMvc, 15개+ 케이스) | 🔲 | T-017 이후 |
| T-020 | JaCoCo 테스트 커버리지 리포트 + GitHub Actions 배지 | 🔲 | T-017~019 이후 |

**완료 기준**: `./gradlew test` 전체 통과 + JaCoCo 핵심 도메인 70%+

---

## Phase 6: 모바일 앱 코드 품질 `P1`

> **목표**: TypeScript 전환 + 상태 관리 개선
> **대상 레포**: `ember-sentinel`
> **선행 조건**: 없음 (Phase 2 이후 권장)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-021 | TypeScript 마이그레이션 (화면 단위 점진적 전환) | 🔲 | 전체 Phase의 기반 |
| T-022 | API 에러 핸들링 통합 (자동 토큰 갱신, 에러 분류) | 🔲 | T-021 이후 |
| T-023 | 상태 관리 개선 (AsyncStorage → Zustand) | 🔲 | T-021 이후 |
| T-024 | ESLint + Prettier + Husky 설정 | 🔲 | T-021 이후 |

**완료 기준**: `npx tsc --noEmit` 에러 0개 + 전체 화면 정상 동작

---

## Phase 7: 엣지 IoT 코드 품질 `P1`

> **목표**: 하드코딩 제거, 에러 핸들링/로깅 강화
> **대상 레포**: `edge-IoT`
> **선행 조건**: Phase 3 (설정 외부화 선행)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-025 | 하드코딩 제거 (IP/URL/MAC/모델 경로 → `config.yaml`) | 🔲 | Phase 3 T-012와 동시 |
| T-026 | 에러 핸들링 강화 (재시도, 장애 복구, 로깅) | 🔲 | |
| T-027 | 로깅 체계 구축 (`logging` 모듈, 파일 로테이션) | 🔲 | |

**완료 기준**: 소스 코드에 IP/URL 직접 문자열 0개 + `config.yaml` 기반 실행

---

## Phase 8: 아키텍처 문서화 `P2`

> **목표**: "왜 이 기술을 선택했는가?" 즉답 가능
> **대상 레포**: `ember-sentinel` (docs/), `Terraform-Bastion-Server`
> **선행 조건**: 없음 (언제든 병렬 진행 가능)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-031 | ADR-001: SFU(LiveKit) vs P2P vs MCU | 🔲 | |
| T-031 | ADR-002: YOLOv11n + NCNN 선택 | 🔲 | |
| T-031 | ADR-003: CQRS 아키텍처 도입 | 🔲 | |
| T-031 | ADR-004: React Native + Expo 선택 | 🔲 | |
| T-031 | ADR-005~008: BLE, JWT, Terraform, Egress | 🔲 | |
| T-032 | Mermaid 시퀀스 다이어그램 (화재 감지 전체 흐름) | 🔲 | |
| T-033 | Mermaid 시퀀스 다이어그램 (인증 흐름) | 🔲 | |

**완료 기준**: `docs/adr/` 에 ADR 8개 + `docs/diagrams/` 에 다이어그램 2개+

---

## Phase 9: 인프라 이전 및 비용 최적화 `P2`

> **목표**: 포트폴리오 시연용 환경을 최소 비용으로 확보
> **대상 레포**: `Terraform-Bastion-Server`, `ember-sentinel-server`
> **선행 조건**: Phase 1 (로컬 환경 먼저 확보)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-028 | Terraform 모듈 리팩토링 (환경별 분리, 비용 태그) | 🔲 | |
| T-029 | 인프라 비용 분석 문서 (AWS 리소스별 breakdown + 대안 비교) | 🔲 | |
| T-030 | Railway/Render 배포 설정 (`railway.toml` / `render.yaml`) | 🔲 | Phase 1 이후 |

**완료 기준**: 비용 분석 문서 작성 + 대안 플랫폼 1개 이상 배포 테스트

---

## Phase 10: AI 모델 시각화 및 실험 `P3`

> **목표**: 모델 성능을 면접에서 수치와 시각 자료로 입증
> **대상 레포**: `ember-sentinel-ai`
> **선행 조건**: 없음

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-035 | 학습 결과 시각화 (loss curve, mAP, confusion matrix, PR curve) | 🔲 | |
| T-036 | 모델 비교 실험 (v11n vs v11s, epoch별, imgsz별) | 🔲 | |
| T-037 | 데이터 증강 실험 (Mosaic, MixUp 전/후 비교) | 🔲 | T-036 이후 |
| T-038 | 추론 속도 벤치마크 (디바이스별 비교표) | 🔲 | |

**완료 기준**: `experiments/results/` 에 비교표 + 시각화 이미지 포함

---

## Phase 11: 모니터링 및 CI/CD `P3`

> **목표**: 운영 관측성 확보 + 전체 레포 CI 통일
> **대상 레포**: 전체
> **선행 조건**: Phase 5 (테스트), Phase 6 (TypeScript 전환)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-039 | Spring Boot Actuator 메트릭 (health, info, metrics) | 🔲 | |
| T-040 | 구조화된 로깅 (JSON Logback, 요청/응답 인터셉터) | 🔲 | |
| T-041 | API 응답 시간 측정 (P50/P95/P99) | 🔲 | T-039 이후 |
| T-042 | 모바일 앱 CI (lint, type-check, 빌드) | 🔲 | Phase 6 이후 |
| T-043 | 엣지 IoT CI (ruff, mypy) | 🔲 | |
| T-044 | 백엔드 CI 개선 (Testcontainers + 커버리지 리포트) | 🔲 | Phase 5 이후 |

**완료 기준**: 5개 레포 모두 GitHub Actions CI 녹색 배지

---

## Phase 12: 문서 및 README 통일 `P3`

> **목표**: GitHub 레포만으로 기술력 증명
> **대상 레포**: 전체
> **선행 조건**: Phase 8 (다이어그램 완성 후)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| T-045 | 5개 레포 README 통일 (배지, 설치 가이드, 아키텍처 요약) | 🔲 | |
| T-046 | 프로젝트 포털 README (전체 관계도, 기술 스택, 데모 링크) | 🔲 | Phase 8 이후 |
| T-047 | API 문서 정리 (Swagger UI + Postman Collection) | 🔲 | |

**완료 기준**: 각 레포 README에 배지 + 아키텍처 요약 + 실행 가이드 포함

---

## Phase 의존성 그래프

```
Phase 1 (로컬 백엔드) ─────┬──► Phase 3 (엣지 시뮬레이터)
                           ├──► Phase 4 (보안 강화)
                           ├──► Phase 5 (테스트 강화) ──► Phase 11 (CI/CD)
                           └──► Phase 9 (인프라 이전)

Phase 2 (모바일 데모) ──────► Phase 6 (앱 코드 품질) ──► Phase 11 (CI/CD)

Phase 3 (엣지 시뮬레이터) ──► Phase 7 (IoT 코드 품질)

Phase 8 (아키텍처 문서) ────► Phase 12 (README 통일)

Phase 10 (AI 시각화) ────── 독립 (병렬 진행 가능)
```

## 면접 시연 준비 체크리스트

Phase 1~3 완료 시점에서 아래 시나리오를 리허설한다.

- [ ] **시나리오 1 (전체 데모 10분)**: Docker Compose 기동 → 로그인 → 화재 감지 트리거 → 알림 → CCTV → 이력
- [ ] **시나리오 2 (오프라인 데모 5분)**: 데모 모드 → 전체 화면 흐름 → 시뮬레이션 버튼 → 아키텍처 설명
- [ ] **시나리오 3 (코드 워크스루 15분)**: 아키텍처 다이어그램 → 핵심 플로우 코드 → CQRS → YOLO → Terraform → 테스트

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-05-20 | 초기 로드맵 작성 (PRD v1.0 기반, 12 Phase, 47 태스크) |
