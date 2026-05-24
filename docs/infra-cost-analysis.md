# Ember Sentinel — 인프라 비용 분석 및 최적화 전략

> **작성일**: 2026-05-21
> **최종 수정**: 2026-05-23 (실제 운영 환경 기준으로 업데이트)
> **대상 레포**: Terraform-Bastion-Server, ember-sentinel-server
> **목적**: AWS 인프라 비용 현황 분석 및 포트폴리오 시연용 최적 운영 방안 도출

---

## 1. 현재 AWS 인프라 비용 상세

### 1.1 실제 운영 중인 리소스 (ap-southeast-2, 2026.05 기준)

| 리소스           | 사양                       | 용도                 | 월 비용 (USD) | 비고                   |
| ---------------- | -------------------------- | -------------------- | :-----------: | ---------------------- |
| EC2 (API Server) | t3.micro (2 vCPU, 1GB)     | Spring Boot API 서버 |      $0       | 프리 티어 (750시간/월) |
| RDS PostgreSQL   | db.t4g.micro (2 vCPU, 1GB) | ember_sentinel DB    |      $0       | RDS 크레딧 $20 적용    |
| S3               | < 1GB                      | 녹화 영상 저장       |      $0       | 프리 티어 범위 내      |
| ECR              | 1개 리포지토리             | Docker 이미지        |      ~$0      | 저장량 미미            |
| Data Transfer    | ~수 GB/월                  | 인/아웃바운드        |     ~$14      | 크레딧으로 충당        |
| **합계**         |                            |                      |    **$0**     | 크레딧으로 전액 충당   |

> **LiveKit**: 자체 호스팅 EC2 없이 **LiveKit Cloud** (무료 티어) 사용 중
> (`<YOUR_LIVEKIT_URL>`)

### 1.2 AWS 크레딧 현황

| 크레딧 종류   | 금액 | 만료일     | 사용액 |
| ------------- | ---- | ---------- | ------ |
| AWS Free Tier | $100 | 2027.05.21 | $0     |
| RDS 크레딧    | $20  | 2027.05.21 | $0     |
| **합계**      | $120 |            | **$0** |

> **핵심**: 현재 실 청구액 **$0**. 크레딧 $120이 남아있으며 2027년 5월까지 유효.
> t3.micro 프리 티어 + LiveKit Cloud 무료 티어 조합으로 비용 없이 운영 중.

### 1.3 초기 설계 vs 실제 운영 비교

| 항목         | 초기 설계 (Terraform 코드)         | 실제 운영                        |
| ------------ | ---------------------------------- | -------------------------------- |
| AWS 리전     | us-west-2 (오레곤)                 | **ap-southeast-2 (시드니)**      |
| API 서버     | t3.medium (2 vCPU, 4GB) — $30/월   | **t3.micro (프리 티어)** — $0    |
| LiveKit      | m5.xlarge (4 vCPU, 16GB) — $140/월 | **LiveKit Cloud 무료 티어** — $0 |
| 예상 월 비용 | ~$197                              | **$0**                           |

> 초기에는 EC2 2대(API + LiveKit)로 설계했으나, LiveKit Cloud 전환과 인스턴스 다운사이징으로 비용을 **$0**으로 절감함.

---

## 2. 대안 비교 (참고용)

아래는 초기 설계 기준으로 검토했던 대안이다. 현재는 프리 티어 + LiveKit Cloud로 해결되어 즉시 적용 필요성은 낮음.

### 2.1 비교 매트릭스

| 항목            | 현재 (프리 티어 + LiveKit Cloud) | Railway/Render |   로컬 Docker    |
| --------------- | :------------------------------: | :------------: | :--------------: |
| **월 비용**     |                $0                |    ~$12–26     |        $0        |
| **외부 접근**   |          O (Public IP)           | O (자동 HTTPS) |  X (로컬 전용)   |
| **LiveKit**     |        O (LiveKit Cloud)         |  **X** (UDP)   |        O         |
| **Egress 녹화** |        O (LiveKit Cloud)         |     **X**      |        O         |
| **시연 적합도** |               최고               |      높음      | 높음 (대면 시연) |

---

## 3. 비용 최적화 — 현재 상태 평가

현재 이미 최적화된 상태:

- EC2: t3.micro → 프리 티어 무료
- LiveKit: Cloud 무료 티어 → EC2 불필요
- RDS: 크레딧 $20 적용 → 무료
- 총 비용: **$0/월**

### 3.1 크레딧 소진 후 대비 (2027.05 이후)

| 전략                                | 예상 비용 | 난이도 |
| ----------------------------------- | :-------: | :----: |
| t3.micro 유지 (프리 티어 12개월 후) | ~$7.59/월 |  낮음  |
| RDS → Supabase Free 마이그레이션    |    $0     |  중간  |
| EC2 → Render/Railway 전환           |  $0–7/월  |  중간  |
| 전체 로컬 Docker 전환               |    $0     |  낮음  |

---

## 4. 권장 운영 방안

### 4.1 현재 (크레딧 유효 기간): AWS 유지

- EC2 t3.micro + RDS + LiveKit Cloud = **$0/월**
- 크레딧 $120으로 Data Transfer 등 부수 비용도 충당
- 2027년 5월까지 안정적 운영 가능

### 4.2 대면 시연: 로컬 Docker (보조)

- `docker compose up` → 전체 스택 시연 (LiveKit + Egress 포함)
- 비용: $0, 준비 시간: 3분

### 4.3 운영 모드 요약

```
현재 (~2027.05)      → AWS 프리 티어 + LiveKit Cloud ($0)
대면 시연 (보조)     → 로컬 Docker ($0)
크레딧 소진 후       → Render/Supabase 전환 또는 로컬 Docker 전용
```

---

## 5. 면접 예상 질문 및 답변

### Q1: "인프라 비용은 어떻게 관리하셨나요?"

> 초기 설계에서는 EC2 2대(API t3.medium + LiveKit m5.xlarge)로 월 약 $197이 예상되었습니다. 이를 최적화하기 위해 LiveKit을 자체 호스팅에서 **LiveKit Cloud 무료 티어**로 전환하고, API 서버도 **t3.micro(프리 티어)**로 다운사이징하여 현재 월 비용을 **$0**으로 운영하고 있습니다. AWS 크레딧 $120이 2027년 5월까지 유효하여 당분간 추가 비용이 발생하지 않습니다.

### Q2: "왜 LiveKit Cloud를 선택하셨나요?"

> 자체 호스팅 LiveKit SFU 서버는 m5.xlarge(월 $140)가 필요했고, 전체 비용의 71%를 차지했습니다. LiveKit Cloud는 무료 티어에서 월 100 participant-minutes를 제공하며, 캡스톤 프로젝트의 데모 수준에서는 충분합니다. 또한 Egress(녹화), TURN 서버, 모니터링 등이 내장되어 있어 운영 부담도 줄었습니다.

### Q3: "Terraform으로 인프라를 관리한 이유는?"

> EC2, RDS, S3, ECR, 보안 그룹 등 리소스가 다양해서 콘솔로 수동 관리하면 실수가 잦고 재현이 어렵습니다. Terraform으로 코드화하면 `terraform apply` 한 번으로 전체 인프라를 생성하고, `terraform destroy`로 깔끔하게 정리할 수 있습니다. 실제로 초기 설계를 변경할 때도 코드만 수정하면 되어 빠르게 인프라를 재구성할 수 있었습니다.

### Q4: "프리 티어 종료 후 계획은?"

> 2027년 5월 이후에는 세 가지 옵션을 검토하고 있습니다. (1) API 서버를 Render 무료 티어로 이전하고 DB를 Supabase Free로 마이그레이션하면 $0 유지 가능, (2) t3.micro 유지 시 월 ~$8 수준으로 부담 적음, (3) 포트폴리오 시연 전용이라면 로컬 Docker로 전환하여 비용 $0을 유지하는 방안도 있습니다.

---

## 부록: AWS 가격 참조

- EC2 가격: [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/on-demand/) (ap-southeast-2)
- RDS 가격: [AWS RDS Pricing](https://aws.amazon.com/rds/postgresql/pricing/) (db.t4g.micro)
- S3 가격: [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/) (Standard, ap-southeast-2)
- LiveKit Cloud: [LiveKit Pricing](https://livekit.io/pricing) (무료 티어: 100 participant-minutes/월)
- 가격 기준일: 2026-05-23 (AWS 공식 페이지 + 실제 청구서 기준)
