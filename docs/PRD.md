# Ember Sentinel - 프로젝트 개선 PRD

> **문서 버전**: v1.0
> **작성일**: 2026-05-20
> **작성자**: JeffKM
> **목적**: 캡스톤 프로젝트 종료 후, 면접 시연 및 포트폴리오 활용을 위한 전체 시스템 개선 계획

---

## 1. 배경 및 현황

### 1.1 프로젝트 개요

Ember Sentinel은 Edge AI 카메라를 활용한 조기 화재/연기 감지 및 실시간 CCTV 모니터링 서비스이다. 인하대학교 캡스톤 디자인 프로젝트로 개발되었으며, 5개의 레포지토리로 구성된다.

| 레포지토리 | 역할 | 기술 스택 |
|---|---|---|
| ember-sentinel | 모바일 앱 | React Native 0.81, Expo 54, JavaScript |
| ember-sentinel-server | 백엔드 API | Java 17, Spring Boot 3.5, PostgreSQL, Redis |
| ember-sentinel-ai | AI 모델 학습 | Python, YOLOv11n, NCNN |
| edge-IoT | 엣지 디바이스 | Python, OpenCV, LiveKit, BLE |
| Terraform-Bastion-Server | AWS 인프라 IaC | Terraform, AWS |

### 1.2 현재 상태 및 문제점

| 영역 | 현재 상태 | 문제 |
|---|---|---|
| **인프라** | AWS EC2 중지됨, Terraform state 불일치 가능 | 서버를 다시 띄우거나 새 환경으로 이전 필요 |
| **백엔드** | 동작하는 상태이나 운영 환경 부재 | 면접 시 라이브 데모 불가 |
| **모바일 앱** | JavaScript 기반, 오프라인 모드 샘플 데이터 의존 | 서버 없이 앱 시연이 제한적 |
| **엣지 IoT** | IP/URL 하드코딩, 라즈베리파이 현장 필요 | 면접장에서 실물 하드웨어 시연 어려움 |
| **AI 모델** | mAP 87.1% 달성, NCNN 변환 완료 | 모델 성능 시각화 자료 부족 |
| **보안** | `POST /embedded/fire-event/publish` 인증 없음 | 면접 시 보안 질문 취약점 |
| **테스트** | 백엔드 JUnit 최소 수준, 모바일 테스트 없음 | 코드 품질 입증 어려움 |
| **문서화** | CLAUDE.md, README 존재하나 아키텍처 다이어그램 부족 | 면접 발표 자료로 직접 활용 어렵움 |

### 1.3 목표

1. **면접 시연 가능한 환경 구축**: 노트북 하나로 전체 시스템 데모 가능
2. **코드 품질 개선**: 면접관의 코드 리뷰에 대비한 품질 향상
3. **아키텍처 설명력 강화**: "왜 이 기술을 선택했는가"에 대한 근거와 트레이드오프 정리
4. **포트폴리오 완성도**: GitHub 레포만으로 기술력을 보여줄 수 있는 수준

---

## 2. 개선 범위 및 우선순위

### 우선순위 기준

- **P0 (필수)**: 면접 시연에 반드시 필요
- **P1 (높음)**: 면접 질문 대비 및 코드 품질
- **P2 (보통)**: 포트폴리오 완성도 향상
- **P3 (낮음)**: 있으면 좋은 개선

---

## 3. P0 — 면접 시연 환경 구축

### 3.1 로컬 개발 환경 통합 (Docker Compose)

**목표**: `docker compose up` 한 번으로 백엔드 전체 스택 기동

**현재 문제**: AWS EC2가 중지되어 백엔드 서비스 이용 불가. 기존 Terraform 구성은 AWS 비용 발생.

**해결 방안**:

```
docker-compose.yml (ember-sentinel-server 레포)
├── api-server       (Spring Boot, 포트 8080)
├── postgresql       (PostgreSQL 15, 포트 5432)
├── redis            (Redis 7, 포트 6379)
├── livekit-server   (LiveKit SFU, 포트 7880/7881)
├── livekit-egress   (녹화 서비스)
└── minio            (S3 호환 오브젝트 스토리지, 포트 9000)
```

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-001 | Docker Compose 파일 작성 | ember-sentinel-server | PostgreSQL, Redis, LiveKit, MinIO, API 서버 통합 |
| T-002 | `application-local.yml` 프로필 추가 | ember-sentinel-server | 로컬 Docker 환경용 설정 (DB URL, Redis, S3 → MinIO) |
| T-003 | DB 초기화 스크립트 작성 | ember-sentinel-server | `init.sql` — 테이블 생성 + 시드 데이터 (건물, 방, 카메라, 샘플 사용자) |
| T-004 | LiveKit 로컬 설정 | ember-sentinel-server | `livekit-local.yaml` — 로컬 API Key/Secret, Webhook URL 설정 |
| T-005 | MinIO 버킷 자동 생성 | ember-sentinel-server | `mc` CLI로 `ember-sentinel-recordings` 버킷 초기화 |
| T-006 | 환경 변수 가이드 문서 | ember-sentinel-server | `.env.example` 파일 + 로컬 실행 가이드 |

**기대 효과**: 면접 전 노트북에서 `docker compose up -d`로 전체 백엔드 기동. AWS 비용 0원.

### 3.2 모바일 앱 데모 모드 강화

**목표**: 서버 연결 없이도 전체 화면 흐름 시연 가능. 서버 연결 시에는 실제 데이터로 동작.

**현재 문제**: 오프라인 모드가 있으나, 하드코딩된 샘플 데이터가 빈약하고 일부 화면은 서버 의존.

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-007 | 데모 데이터 세트 확충 | ember-sentinel | 건물 3개, 방 5개, 카메라 8개, 화재 이벤트 10개의 리얼리스틱한 샘플 |
| T-008 | API base URL 환경 변수화 | ember-sentinel | `.env` 파일로 분리, 로컬/프로덕션 전환 가능 |
| T-009 | CCTV 화면 데모 영상 | ember-sentinel | 서버 미연결 시 로컬 번들 MP4 파일로 영상 재생 시뮬레이션 |
| T-010 | 화재 이벤트 수동 트리거 | ember-sentinel | 개발자 메뉴에서 "화재 감지 시뮬레이션" 버튼 → 푸시 알림 + 화면 전환 |

### 3.3 엣지 IoT 시뮬레이터

**목표**: 라즈베리파이 없이 노트북에서 엣지 디바이스 동작 시뮬레이션

**현재 문제**: 면접장에 라즈베리파이와 카메라를 가져갈 수 없음

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-011 | 엣지 시뮬레이터 스크립트 | edge-IoT | `simulator.py` — 로컬 웹캠 또는 샘플 영상으로 YOLO 추론 + API 서버 호출 |
| T-012 | 설정 파일 외부화 | edge-IoT | `config.yaml`로 서버 URL, LiveKit URL, 모델 경로, BLE MAC 등 분리 |
| T-013 | BLE 모킹 | edge-IoT | `--no-ble` 플래그로 BLE 없이 실행 가능하도록 |

---

## 4. P1 — 코드 품질 및 보안 개선

### 4.1 백엔드 보안 강화

**면접 예상 질문**: "엣지 디바이스의 API 인증은 어떻게 처리하나요?"

**현재 문제**: `POST /embedded/fire-event/publish`가 인증 없이 열려 있음 → 누구나 가짜 화재 이벤트 발행 가능

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-014 | 엣지 디바이스 API Key 인증 | ember-sentinel-server | `X-Device-API-Key` 헤더 검증, CameraEdge 엔티티에 `api_key` 필드 추가 |
| T-015 | Rate Limiting 적용 | ember-sentinel-server | 화재 이벤트 발행 API에 IP 기반 + 디바이스 기반 레이트 리밋 (1분 1회) |
| T-016 | JWT Refresh Token 회전 | ember-sentinel-server | Refresh Token 사용 시 새 토큰 발급 + 이전 토큰 무효화 (Redis TTL) |

### 4.2 백엔드 테스트 강화

**면접 예상 질문**: "테스트 전략은 어떻게 가져가셨나요?"

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-017 | 핵심 도메인 단위 테스트 | ember-sentinel-server | `FireEventCommandService`, `AuthService`, `RoomCommandService` 테스트 |
| T-018 | 통합 테스트 | ember-sentinel-server | `@SpringBootTest` + Testcontainers (PostgreSQL, Redis) |
| T-019 | API 엔드포인트 테스트 | ember-sentinel-server | MockMvc로 주요 API 15개 이상의 성공/실패 케이스 |
| T-020 | 테스트 커버리지 리포트 | ember-sentinel-server | JaCoCo 설정 + GitHub Actions에서 커버리지 배지 |

### 4.3 모바일 앱 코드 품질

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-021 | TypeScript 마이그레이션 | ember-sentinel | `.js` → `.tsx`/`.ts` 전환, 타입 정의 추가 |
| T-022 | API 에러 핸들링 통합 | ember-sentinel | `apiRequest()`에 자동 토큰 갱신, 에러 분류(네트워크/인증/서버), 사용자 피드백 |
| T-023 | 상태 관리 개선 | ember-sentinel | AsyncStorage 직접 접근 → Context 또는 Zustand로 인증 상태 중앙 관리 |
| T-024 | ESLint + Prettier 설정 | ember-sentinel | 코드 스타일 일관성 + `husky` pre-commit 훅 |

### 4.4 엣지 IoT 코드 품질

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-025 | 하드코딩 제거 | edge-IoT | 모든 IP/URL/MAC/모델 경로를 `config.yaml`로 외부화 |
| T-026 | 에러 핸들링 강화 | edge-IoT | 네트워크 실패 시 재시도, BLE 연결 실패 시 로깅, 카메라 장애 복구 |
| T-027 | 로깅 체계 구축 | edge-IoT | `logging` 모듈 사용, 파일 로테이션, 레벨별 구분 |

---

## 5. P2 — 아키텍처 설명력 강화

### 5.1 인프라 이전 (AWS → 비용 효율적 대안)

**목표**: 포트폴리오 시연용 상시 운영 환경을 최소 비용으로 유지

**선택지 비교**:

| 옵션 | 장점 | 단점 | 예상 월 비용 |
|---|---|---|---|
| **A. AWS 재기동** | 기존 Terraform 재활용 | EC2 2대 + RDS + ElastiCache 비용 큼 | $100~150 |
| **B. Railway/Render** | Docker 배포 간편, 무료 티어 | LiveKit 별도 운영 필요, 커스텀 인프라 제약 | $10~30 |
| **C. AWS Lightsail + Supabase** | Lightsail 저렴, Supabase PostgreSQL 무료 | LiveKit은 별도 서버 필요 | $20~40 |
| **D. 로컬 Docker만 (권장)** | 비용 0, 완전한 제어 | 외부 접근 불가 (면접장 현장 시연만) | $0 |

**권장**: 기본은 **옵션 D (로컬 Docker)**, 필요 시 **옵션 B/C**로 외부 데모 URL 확보

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-028 | Terraform 모듈 리팩토링 | Terraform-Bastion-Server | 환경별 분리 (dev/prod), 비용 태그 추가 |
| T-029 | 인프라 비용 분석 문서 | Terraform-Bastion-Server | AWS 리소스별 월 비용 breakdown + 대안 비교표 |
| T-030 | Railway/Render 배포 설정 | ember-sentinel-server | `Dockerfile` 최적화, `railway.toml` 또는 `render.yaml` 작성 |

### 5.2 아키텍처 의사결정 기록 (ADR)

**목표**: 면접에서 "왜 이 기술을 선택했는가?" 질문에 즉답 가능

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-031 | ADR 문서 작성 | ember-sentinel | `docs/adr/` 디렉토리에 핵심 의사결정 기록 |

**작성할 ADR 목록**:

| ADR | 제목 | 핵심 트레이드오프 |
|---|---|---|
| ADR-001 | SFU(LiveKit) vs P2P vs MCU | 1:N 스트리밍 → SFU 선택, 엣지 리소스 절약 |
| ADR-002 | YOLOv11n + NCNN 선택 | 모바일 GPU 없는 환경에서 78.5ms 추론, 정확도 vs 속도 |
| ADR-003 | CQRS 아키텍처 도입 | 읽기/쓰기 분리의 실익, 오버엔지니어링 우려 |
| ADR-004 | React Native + Expo 선택 | 크로스플랫폼 vs 네이티브, New Architecture 활성화 |
| ADR-005 | BLE 저전력 설계 | 1.6% 듀티 사이클로 1년+ 배터리, 스캔 주기 트레이드오프 |
| ADR-006 | JWT + OAuth2 인증 전략 | 세션 vs 토큰, Refresh Token 회전 정책 |
| ADR-007 | Terraform IaC 전략 | 수동 관리 vs IaC, 상태 관리 방식 |
| ADR-008 | WebRTC Egress 녹화 전략 | 서버사이드 녹화 vs 클라이언트 녹화, S3 직접 업로드 |

### 5.3 시스템 시퀀스 다이어그램

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-032 | Mermaid 시퀀스 다이어그램 | ember-sentinel | 화재 감지 → 알림 → 스트리밍 전체 흐름 |
| T-033 | 인증 흐름 다이어그램 | ember-sentinel | 소셜 로그인 → JWT 발급 → 토큰 갱신 흐름 |
| T-034 | 인프라 아키텍처 다이어그램 | Terraform-Bastion-Server | draw.io 또는 Mermaid로 AWS 리소스 관계도 |

---

## 6. P3 — 포트폴리오 완성도

### 6.1 AI 모델 개선 및 시각화

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-035 | 학습 결과 시각화 대시보드 | ember-sentinel-ai | loss curve, mAP 변화, confusion matrix, PR curve 이미지 저장 |
| T-036 | 모델 비교 실험 | ember-sentinel-ai | YOLOv11n vs YOLOv11s, epoch 수별, 이미지 크기별 비교표 |
| T-037 | 데이터 증강 실험 | ember-sentinel-ai | Mosaic, MixUp, RandomFlip 등 증강 기법 적용 전/후 비교 |
| T-038 | 추론 속도 벤치마크 | ember-sentinel-ai | 디바이스별(RPi5, 맥북, 서버) 추론 속도 비교표 |

### 6.2 모니터링 및 관측성

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-039 | Spring Boot Actuator 메트릭 | ember-sentinel-server | health, info, metrics 엔드포인트 활성화 |
| T-040 | 구조화된 로깅 | ember-sentinel-server | JSON 형식 로깅 (Logback), 요청/응답 로깅 인터셉터 |
| T-041 | API 응답 시간 측정 | ember-sentinel-server | 엔드포인트별 P50/P95/P99 응답 시간 메트릭 |

### 6.3 CI/CD 개선

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-042 | 모바일 앱 CI 추가 | ember-sentinel | GitHub Actions — lint, type-check (TS 전환 후), 빌드 검증 |
| T-043 | 엣지 IoT CI 추가 | edge-IoT | GitHub Actions — Python lint (ruff), type-check (mypy) |
| T-044 | 백엔드 CI 개선 | ember-sentinel-server | Testcontainers 통합 테스트, 커버리지 리포트 자동 발행 |

### 6.4 README 및 문서 개선

**상세 태스크**:

| ID | 태스크 | 레포 | 설명 |
|---|---|---|---|
| T-045 | 각 레포 README 통일 | 전체 | 배지(CI, 커버리지, 라이선스), 설치 가이드, 아키텍처 요약 포함 |
| T-046 | 전체 프로젝트 포털 README | ember-sentinel | 5개 레포 관계도, 기술 스택 요약, 데모 영상 링크 |
| T-047 | API 문서 정리 | ember-sentinel-server | Swagger UI + Postman Collection 내보내기 |

---

## 7. 면접 시연 시나리오

### 시나리오 1: 전체 데모 (10분)

```
1. 노트북에서 Docker Compose로 백엔드 기동 (사전 준비)
2. 모바일 앱 실행 → 소셜 로그인 시연
3. 홈 화면에서 Room 목록 확인
4. 엣지 시뮬레이터로 화재 감지 트리거
5. 모바일 앱에서 푸시 알림 수신 확인
6. 실시간 CCTV 영상 시청
7. 화재 이벤트 이력 → 녹화 영상 재생
8. 아키텍처 다이어그램으로 시스템 설명
```

### 시나리오 2: 오프라인 데모 (5분)

```
1. 모바일 앱 데모 모드로 실행 (서버 불필요)
2. 샘플 데이터로 전체 화면 흐름 시연
3. "화재 감지 시뮬레이션" 버튼으로 알림 흐름 시연
4. 아키텍처 다이어그램 + ADR로 기술 선택 설명
```

### 시나리오 3: 코드 워크스루 (15분)

```
1. 시스템 아키텍처 다이어그램으로 전체 구조 설명
2. 화재 감지 플로우: edge-IoT → API → FCM → 모바일 앱
3. CQRS 패턴: Command/Query 분리 구조 코드 리뷰
4. YOLO 모델 학습 파이프라인 + 성능 메트릭 설명
5. Terraform IaC: 인프라 구성 코드 리뷰
6. 테스트 전략 설명 + 테스트 실행 시연
```

---

## 8. 면접 예상 질문 및 답변 준비 포인트

### 아키텍처

| 질문 | 답변 키워드 |
|---|---|
| "왜 SFU를 선택했나?" | P2P는 1:N 부적합, MCU는 서버 부하 과다, SFU는 엣지 리소스 절약 + N명 시청 가능 |
| "CQRS를 왜 도입했나?" | 화재 이벤트 조회(Query)가 빈번, 생성(Command)은 엣지에서만 발생 → 읽기/쓰기 최적화 분리 |
| "JWT vs 세션 인증?" | 모바일 앱 특성상 Stateless 필요, Refresh Token + Redis로 강제 만료 지원 |
| "왜 React Native?" | 크로스플랫폼 + Expo OTA 업데이트, New Architecture로 네이티브 성능 확보 |

### AI/ML

| 질문 | 답변 키워드 |
|---|---|
| "YOLOv11n 선택 이유?" | 엣지(RPi5)에서 실시간 추론 필수 → v11n은 78.5ms, larger 모델은 200ms+ |
| "NCNN 변환 후 mAP 상승?" | FP16 양자화의 정규화 효과, 오버피팅 완화 |
| "데이터셋 편향은?" | FASDD_CV의 fire/smoke 비율 불균형 인지 → EDA로 분석, 향후 데이터 증강 계획 |

### 인프라/DevOps

| 질문 | 답변 키워드 |
|---|---|
| "Terraform 선택 이유?" | 선언적 IaC, 상태 파일로 변경 추적, 팀 협업 시 인프라 리뷰 가능 |
| "비용 최적화는?" | LiveKit은 m5.xlarge 필수(WebRTC CPU 집약적), API는 t3.medium으로 절감 |
| "CI/CD 파이프라인?" | OIDC로 시크릿 없는 AWS 인증, ECR+SSM으로 무중단 배포 |

### 보안

| 질문 | 답변 키워드 |
|---|---|
| "엣지 디바이스 인증?" | 디바이스별 API Key 발급 → X-Device-API-Key 헤더 검증 (P1 개선 사항) |
| "시크릿 관리?" | Git submodule로 분리, 프로덕션은 AWS Secrets Manager/SSM Parameter Store |
| "CORS 정책?" | 모바일 앱은 CORS 미적용, Swagger UI는 개발 환경만 허용 |

---

## 9. 태스크 요약 및 일정 추정

### P0 태스크 (필수, 면접 시연 환경)

| ID | 태스크 | 레포 | 의존성 |
|---|---|---|---|
| T-001 | Docker Compose 작성 | server | - |
| T-002 | application-local.yml | server | T-001 |
| T-003 | DB 초기화 스크립트 | server | T-001 |
| T-004 | LiveKit 로컬 설정 | server | T-001 |
| T-005 | MinIO 버킷 자동 생성 | server | T-001 |
| T-006 | 환경 변수 가이드 | server | T-001 ~ T-005 |
| T-007 | 데모 데이터 확충 | app | - |
| T-008 | API base URL 환경 변수화 | app | - |
| T-009 | CCTV 데모 영상 | app | - |
| T-010 | 화재 이벤트 수동 트리거 | app | T-007 |
| T-011 | 엣지 시뮬레이터 | edge-IoT | T-001 |
| T-012 | 설정 파일 외부화 | edge-IoT | - |
| T-013 | BLE 모킹 | edge-IoT | T-012 |

### P1 태스크 (높음, 코드 품질)

| ID | 태스크 | 레포 | 의존성 |
|---|---|---|---|
| T-014 | 엣지 디바이스 API Key 인증 | server | - |
| T-015 | Rate Limiting | server | T-014 |
| T-016 | JWT Refresh Token 회전 | server | - |
| T-017 | 핵심 도메인 단위 테스트 | server | - |
| T-018 | 통합 테스트 (Testcontainers) | server | T-001 |
| T-019 | API 엔드포인트 테스트 | server | T-017 |
| T-020 | 테스트 커버리지 리포트 | server | T-017 ~ T-019 |
| T-021 | TypeScript 마이그레이션 | app | - |
| T-022 | API 에러 핸들링 통합 | app | T-021 |
| T-023 | 상태 관리 개선 | app | T-021 |
| T-024 | ESLint + Prettier 설정 | app | T-021 |
| T-025 | 하드코딩 제거 | edge-IoT | T-012 |
| T-026 | 에러 핸들링 강화 | edge-IoT | - |
| T-027 | 로깅 체계 구축 | edge-IoT | - |

### P2 태스크 (보통, 아키텍처 설명력)

| ID | 태스크 | 레포 | 의존성 |
|---|---|---|---|
| T-028 | Terraform 모듈 리팩토링 | terraform | - |
| T-029 | 인프라 비용 분석 | terraform | - |
| T-030 | Railway/Render 배포 설정 | server | T-001 |
| T-031 | ADR 문서 8개 작성 | app (docs/) | - |
| T-032 | 시퀀스 다이어그램 | app (docs/) | - |
| T-033 | 인증 흐름 다이어그램 | app (docs/) | - |
| T-034 | 인프라 아키텍처 다이어그램 | terraform | - |

### P3 태스크 (낮음, 포트폴리오 완성도)

| ID | 태스크 | 레포 | 의존성 |
|---|---|---|---|
| T-035 | AI 학습 시각화 대시보드 | ai | - |
| T-036 | 모델 비교 실험 | ai | - |
| T-037 | 데이터 증강 실험 | ai | T-036 |
| T-038 | 추론 속도 벤치마크 | ai | - |
| T-039 | Actuator 메트릭 | server | - |
| T-040 | 구조화된 로깅 | server | - |
| T-041 | API 응답 시간 측정 | server | T-039 |
| T-042 | 모바일 앱 CI | app | T-021 |
| T-043 | 엣지 IoT CI | edge-IoT | - |
| T-044 | 백엔드 CI 개선 | server | T-017 ~ T-019 |
| T-045 | README 통일 | 전체 | - |
| T-046 | 프로젝트 포털 README | app | T-032 |
| T-047 | API 문서 정리 | server | - |

---

## 10. 기술적 제약 및 리스크

| 리스크 | 영향 | 대응 방안 |
|---|---|---|
| LiveKit 로컬 실행 시 WebRTC NAT 문제 | 스트리밍 연결 실패 | Docker 네트워크 모드 `host` 또는 TURN 서버 설정 |
| MinIO ↔ S3 API 호환성 차이 | Presigned URL 동작 차이 | MinIO 최신 버전 사용, `path-style` 접근 강제 |
| React Native New Architecture 호환성 | 일부 네이티브 모듈 미지원 | Expo SDK 54 호환 라이브러리만 사용 |
| Testcontainers macOS Docker Desktop 의존 | CI 환경 차이 | GitHub Actions에서는 서비스 컨테이너 사용 |
| TypeScript 마이그레이션 범위 | 일괄 전환 시 빌드 불안정 | 점진적 마이그레이션 — 화면 단위로 `.js` → `.tsx` |

---

## 11. 성공 기준

| 기준 | 측정 방법 |
|---|---|
| 로컬 환경 기동 | `docker compose up` 후 3분 내 전체 서비스 정상 응답 |
| 모바일 앱 데모 | 서버 없이 9개 화면 모두 탐색 가능 |
| 화재 시연 | 엣지 시뮬레이터 → 푸시 알림 → 영상 확인까지 30초 내 |
| 테스트 커버리지 | 백엔드 핵심 도메인 70% 이상 |
| 문서 완성도 | ADR 8개 + 시퀀스 다이어그램 2개 + 인프라 다이어그램 1개 |
| 면접 시나리오 | 3가지 시나리오 모두 중단 없이 실행 가능 |
