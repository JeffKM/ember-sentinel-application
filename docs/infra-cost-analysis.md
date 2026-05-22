# Ember Sentinel — 인프라 비용 분석 및 최적화 전략

> **작성일**: 2026-05-21
> **대상 레포**: Terraform-Bastion-Server, ember-sentinel-server
> **목적**: AWS 인프라 비용 현황 분석 및 포트폴리오 시연용 최적 운영 방안 도출

---

## 1. 현재 AWS 인프라 비용 상세

### 1.1 리소스별 월 비용 (us-west-2, On-Demand 기준)

| 리소스           | 사양                       | 용도                  | 월 비용 (USD) | 비고                      |
| ---------------- | -------------------------- | --------------------- | :-----------: | ------------------------- |
| EC2 (API Server) | t3.medium (2 vCPU, 4GB)    | Spring Boot + Redis   |    $30.37     | 730시간 × $0.0416/h       |
| EC2 (LiveKit)    | m5.xlarge (4 vCPU, 16GB)   | LiveKit SFU + Egress  |    $140.16    | 730시간 × $0.192/h        |
| RDS PostgreSQL   | db.t4g.micro (2 vCPU, 1GB) | ember_sentinel DB     |    $12.41     | 730시간 × $0.017/h        |
| RDS Storage      | 20GB gp2                   | DB 스토리지           |     $2.30     | 20GB × $0.115/GB          |
| S3               | < 1GB                      | 녹화 영상 저장        |     $0.02     | 저장량 미미               |
| ECR              | 2개 리포지토리             | Docker 이미지         |     $0.50     | 이미지 크기에 따라 변동   |
| Data Transfer    | ~5GB/월                    | 인/아웃바운드         |     $0.45     | 첫 100GB 무료 후 $0.09/GB |
| **Bastion EC2**  | t2.micro                   | Terraform 실행 호스트 |     $8.47     | 프리 티어 종료 시         |
| EBS Volumes      | 3 × 8GB gp3                | EC2 루트 볼륨         |     $1.92     | 24GB × $0.08/GB           |
| **합계**         |                            |                       | **~$196.60**  |                           |

### 1.2 비용 구성 비율

```
LiveKit EC2 (m5.xlarge) ████████████████████████████████████  71.3%
API EC2 (t3.medium)     █████████                             15.4%
RDS                     ████                                   7.5%
기타 (S3, ECR, EBS 등)  ██                                     5.8%
```

> **핵심 인사이트**: 전체 비용의 **71%가 LiveKit 서버(m5.xlarge)**에 집중. WebRTC SFU + Egress(녹화)를 위한 CPU/메모리 요구량이 높아 m5.xlarge가 필수적이었음.

### 1.3 가격 비교: On-Demand vs Reserved vs Spot

| 리소스       |  On-Demand  | Reserved 1년 (전체 선결제) |       Spot       | 비고                    |
| ------------ | :---------: | :------------------------: | :--------------: | ----------------------- |
| t3.medium    |  $30.37/월  |      $19.42/월 (-36%)      | $12.49/월 (-59%) | API 서버에 적합         |
| m5.xlarge    | $140.16/월  |      $86.14/월 (-39%)      | $63.07/월 (-55%) | LiveKit — Spot 불안정   |
| db.t4g.micro |  $12.41/월  |      $8.03/월 (-35%)       |       N/A        | RDS Reserved 추천       |
| **합계**     | **$182.94** |        **$113.59**         |        —         | Reserved만으로 38% 절감 |

---

## 2. 4가지 대안 비교

### 2.1 비교 매트릭스

| 항목              |      AWS 재기동       |      Railway/Render      | Lightsail + Supabase |     로컬 Docker     |
| ----------------- | :-------------------: | :----------------------: | :------------------: | :-----------------: |
| **월 비용**       |   ~$197 (On-Demand)   |         ~$12–26          |       ~$22–27        |         $0          |
| **초기 설정**     | 없음 (기존 Terraform) | 중간 (Dockerfile 최적화) | 중간 (마이그레이션)  | 없음 (Phase 1 완료) |
| **외부 접근**     |     O (Public IP)     |      O (자동 HTTPS)      |     O (고정 IP)      |    X (로컬 전용)    |
| **LiveKit**       |           O           |     **X** (UDP 차단)     |    별도 서버 필요    |          O          |
| **Egress 녹화**   |           O           |          **X**           |          X           |          O          |
| **자동 스케일링** |         수동          |         O (자동)         |          X           |          X          |
| **SSL/HTTPS**     |       수동 설정       |           자동           |         수동         |          X          |
| **시연 적합도**   |         최고          |   높음 (LiveKit 제외)    |         중간         |  높음 (대면 시연)   |
| **면접 어필**     |     IaC 경험 증명     |      PaaS 배포 경험      |   비용 최적화 역량   |    Docker 숙련도    |

### 2.2 대안별 상세 분석

#### A. AWS 재기동 (현행 유지)

- **장점**: 전체 기능 동작 (LiveKit + Egress + FCM), 기존 CI/CD 파이프라인 활용
- **단점**: 월 ~$197 비용 (학생/포트폴리오 대비 과도), 사용하지 않을 때도 과금
- **적합 시나리오**: 최종 데모 직전 1–2일만 기동 → **일 비용 ~$6.50**

#### B. Railway / Render (PaaS)

| 항목       | Railway                    | Render                            |
| ---------- | -------------------------- | --------------------------------- |
| 무료 티어  | 월 $5 크레딧               | 750시간/월 무료 (정적 서비스)     |
| API 서버   | Starter $5/월              | Free 또는 Starter $7/월           |
| PostgreSQL | $5/월 (Plugin)             | Free (90일 제한) → $7/월          |
| Redis      | $5/월 (Plugin)             | $0 (내장 캐시 불가, 별도 필요)    |
| 총 비용    | **~$15–20/월**             | **~$7–14/월**                     |
| 특이사항   | Nixpacks 빌드, Railway CLI | Blueprint(render.yaml), 자동 배포 |

- **장점**: 자동 HTTPS, Git 연동 자동 배포, 인프라 관리 불필요
- **단점**: LiveKit (UDP) 불가, Egress 불가, 콜드 스타트 (무료 티어)
- **PaaS 기능 매트릭스**: API + DB + Redis = O, LiveKit/Egress = X, FCM = O (키 설정 시)

#### C. Lightsail + Supabase

| 항목                                |    비용    |
| ----------------------------------- | :--------: |
| Lightsail $5 인스턴스 (1 vCPU, 1GB) |   $5/월    |
| Supabase Free (PostgreSQL 500MB)    |   $0/월    |
| Upstash Redis (무료 티어)           |   $0/월    |
| **합계**                            | **~$5/월** |

- **장점**: 최저 비용으로 외부 데모 가능
- **단점**: Lightsail 1GB RAM으로 Spring Boot 무거움 (최소 512MB 힙), LiveKit 불가, Supabase 무료 프로젝트 7일 미활동 시 일시정지

#### D. 로컬 Docker (Phase 1 기완료)

- **장점**: 비용 $0, 전체 기능 동작, Phase 1에서 이미 구축 완료
- **단점**: 외부 접근 불가 (면접관이 직접 확인 불가), 노트북 구동 필요
- **구성**: `docker compose up` → PostgreSQL + Redis + LiveKit + MinIO + API Server 일괄 기동

---

## 3. 비용 최적화 전략

### 3.1 즉시 적용 가능

| 전략                                 | 절감 효과 | 구현 난이도 |
| ------------------------------------ | :-------: | :---------: |
| EC2 중지 유지, 시연 시만 기동        | ~$190/월  |    낮음     |
| RDS 스냅샷 후 삭제, 필요 시 복원     |  ~$15/월  |    낮음     |
| ECR 미사용 이미지 정리               | ~$0.50/월 |    낮음     |
| S3 Lifecycle Rule (90일 후 Glacier)  |   미미    |    낮음     |
| **Render 무료 티어로 API 상시 운영** | **신규**  |  **중간**   |

### 3.2 중기 적용 (면접 시즌)

| 전략                        | 내용                                                      |
| --------------------------- | --------------------------------------------------------- |
| Spot Instance 활용          | LiveKit 서버를 Spot으로 전환 (55% 절감, 중단 리스크 존재) |
| ARM 기반 전환               | t4g.medium ($24.53/월) → t3.medium 대비 19% 절감          |
| RDS → Supabase 마이그레이션 | PostgreSQL 무료 티어 활용, 연결 문자열만 변경             |
| 예약 인스턴스               | 3개월 이상 사용 확정 시 Reserved 가격 적용                |

---

## 4. 권장 방안

### 4.1 기본 운영: 로컬 Docker

- **대면 면접**: `docker compose up` → 전체 스택 시연 (LiveKit + Egress 포함)
- **비용**: $0/월
- **준비 시간**: 3분 (Phase 1에서 검증 완료)

### 4.2 외부 데모: Render (PaaS)

- **비면접 시연**: Render에 API 서버 + PostgreSQL + Redis 배포
- **비용**: $0–14/월 (무료 티어 활용 가능)
- **제약**: LiveKit/Egress 불가 → 기존 녹화 재생은 S3 Presigned URL로 가능
- **URL 제공**: 면접관에게 `https://ember-sentinel-api.onrender.com` 공유 가능

### 4.3 풀 데모 (필요 시): AWS 일시 기동

- **시나리오**: 최종 면접 전 1–2일만 `terraform apply`
- **비용**: ~$6.50/일
- **목적**: LiveKit 실시간 스트리밍 + Egress 녹화 전체 시연

### 4.4 운영 모드 요약

```
일상 (개발/학습)     → 로컬 Docker ($0)
외부 공유 (링크 시연) → Render Free ($0–14/월)
풀 데모 (면접 당일)   → AWS 일시 기동 (~$6.50/일)
```

---

## 5. 면접 예상 질문 및 답변

### Q1: "AWS 비용이 꽤 높았을 텐데, 어떻게 관리하셨나요?"

> 초기에 On-Demand 기준 월 약 $197이 발생했습니다. 비용의 71%가 LiveKit SFU 서버(m5.xlarge)에 집중되어 있었고, WebRTC 미디어 서버의 특성상 CPU/메모리가 많이 필요했습니다. 개발이 완료된 후에는 EC2를 중지하고, 시연이 필요할 때만 Terraform으로 인프라를 기동하는 방식으로 전환했습니다. 또한 Render에 PaaS 배포 설정을 추가하여 LiveKit을 제외한 API 데모를 무료로 상시 운영할 수 있게 했습니다.

### Q2: "왜 처음부터 PaaS를 사용하지 않으셨나요?"

> LiveKit은 WebRTC 기반 SFU 서버로 UDP 포트(50000–60000)가 필요합니다. Railway나 Render 같은 PaaS는 HTTP/HTTPS만 지원하고 임의 UDP 포트를 열 수 없어서 LiveKit 서버를 호스팅할 수 없었습니다. 또한 Egress(녹화)에는 Chrome Headless가 필요해 컨테이너 리소스 제한에 걸립니다. 이런 이유로 EC2 직접 배포가 필수였고, 이후 비용 최적화를 위해 PaaS 대안을 추가로 준비했습니다.

### Q3: "Terraform으로 인프라를 관리한 이유는?"

> 프로젝트 인프라가 EC2 2대, RDS, S3, ECR, 보안 그룹 3개 등 리소스가 많아서 콘솔로 수동 관리하면 실수가 잦고 재현이 어렵습니다. Terraform으로 코드화하면 `terraform apply` 한 번으로 전체 인프라를 생성하고, `terraform destroy`로 깔끔하게 정리할 수 있습니다. 특히 "시연 시만 기동" 전략에서 매번 동일한 환경을 재현할 수 있다는 점이 결정적이었습니다.

### Q4: "모듈화를 어떻게 하셨나요?"

> 초기에는 단일 `main.tf`에 모든 리소스를 정의했지만, 리팩토링을 통해 4개 모듈(networking, compute, database, storage)로 분리했습니다. 각 모듈은 독립적으로 변경/테스트 가능하고, `environments/dev`와 `environments/prod`로 환경별 변수를 분리하여 동일 모듈을 재사용합니다. 예를 들어 dev 환경에서는 t3.micro를 사용하고 prod에서는 t3.medium을 사용하는 식입니다.

### Q5: "비용 절감을 위해 어떤 대안을 검토하셨나요?"

> 4가지 대안을 비교했습니다. (1) AWS On-Demand 유지 — 월 $197로 과도, (2) Railway/Render PaaS — 월 $0–14로 저렴하지만 LiveKit 불가, (3) Lightsail + Supabase — 월 $5로 최저비용이지만 RAM 제한, (4) 로컬 Docker — $0이지만 외부 접근 불가. 최종적으로 "로컬 Docker 기본 + Render 외부 데모 + AWS 일시 기동"의 3단계 전략을 채택하여 평상시 비용을 $0으로 유지하면서도 필요 시 전체 시연이 가능하도록 했습니다.

---

## 부록: AWS 가격 참조

- EC2 가격: [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/on-demand/) (us-west-2)
- RDS 가격: [AWS RDS Pricing](https://aws.amazon.com/rds/postgresql/pricing/) (db.t4g.micro)
- S3 가격: [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/) (Standard, us-west-2)
- 가격 기준일: 2026-05-21 (AWS 공식 페이지 기준)
