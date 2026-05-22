# ADR-007: 인프라 관리에 Terraform IaC 도입

## 상태

**Accepted** (2025-04)

## 맥락

Ember Sentinel 시스템은 다수의 AWS 리소스를 사용한다:

| 리소스           | 사양                        | 용도                     |
| ---------------- | --------------------------- | ------------------------ |
| EC2 (API Server) | t3.medium                   | Spring Boot + Redis      |
| EC2 (LiveKit)    | m5.xlarge                   | LiveKit SFU + Egress     |
| RDS              | db.t4g.micro, PostgreSQL 15 | 메인 DB                  |
| S3               | Standard                    | 녹화 영상 저장           |
| ECR              | 2개 레포                    | Docker 이미지 레지스트리 |
| 보안 그룹        | 3개                         | 네트워크 접근 제어       |

이를 AWS 콘솔에서 수동으로 관리할지, IaC(Infrastructure as Code)로 관리할지 결정해야 한다.

### 고려 사항

1. **팀 규모**: 4명 → 인프라 변경을 코드 리뷰 가능해야 함
2. **재현성**: 개발/프로덕션 환경을 동일하게 프로비저닝 필요
3. **비용 관리**: 사용하지 않는 리소스 파악 및 정리 용이해야 함
4. **면접 설명력**: 인프라 구성을 코드로 설명할 수 있어야 함

## 결정

**Terraform을 사용하여 전체 AWS 인프라를 코드로 관리**한다.

### 적용 구조

```
Terraform-Bastion-Server/
├── provider.tf          # AWS, Random, HTTP 프로바이더
├── variables.tf         # 입력 변수 (sensitive 분리)
├── main.tf              # 전체 리소스 정의
├── outputs.tf           # 배포 후 출력값
└── templates/           # EC2 User Data 템플릿
    ├── api_server_userdata.sh
    ├── livekit_userdata.sh
    ├── livekit.yaml.tftpl
    ├── egress.yaml.tftpl
    └── docker-compose.livekit.yml
```

### 실행 환경

- **Bastion EC2 내부에서 Terraform 실행**: IAM Instance Profile을 통해 AWS 자격 증명 자동 상속
- 시크릿은 `secrets.tfvars` 파일로 분리 (Git에 포함하지 않음)

## 대안 분석

### AWS 콘솔 수동 관리 — 기각

- 장점: 학습 곡선 없음, 즉시 사용 가능
- 단점:
  - 변경 이력 추적 불가 → "누가 언제 보안 그룹을 바꿨는지" 알 수 없음
  - 환경 재현 불가 → 개발 환경을 프로덕션과 동일하게 만들기 어려움
  - 면접 시 인프라 구성을 코드로 설명 불가

### AWS CloudFormation — 기각

- 장점: AWS 네이티브, 별도 상태 관리 불필요
- 단점:
  - JSON/YAML 템플릿이 HCL 대비 가독성 낮음
  - AWS 전용 → 향후 멀티 클라우드 확장 불가
  - 드리프트 감지가 Terraform 대비 제한적

### AWS CDK — 기각

- 장점: TypeScript/Python 등 범용 언어 사용
- 단점:
  - CloudFormation 위의 추상화 계층 → 디버깅 시 CF 템플릿 이해 필요
  - 팀 내 CDK 경험 없음
  - 학생 프로젝트에서 CDK의 추가 복잡도 불필요

### Pulumi — 기각

- 장점: TypeScript로 인프라 정의, 조건문/반복문 자유로움
- 단점:
  - 상용 서비스 의존 (state 관리)
  - 커뮤니티/자료가 Terraform 대비 적음
  - 팀 학습 비용 대비 이점 부족

## 결과

### 긍정적

- `terraform plan`으로 변경 사항 사전 검토 → 실수로 인한 인프라 장애 방지
- `terraform destroy`로 비용 즉시 절감 가능 (사용하지 않을 때 전체 리소스 삭제)
- 코드 리뷰를 통한 인프라 변경 협업 가능
- 면접 시 `main.tf`로 인프라 구성을 즉시 설명 가능
- EC2 User Data 템플릿으로 서버 부트스트래핑 자동화

### 부정적

- Terraform 상태 파일(`.tfstate`) 관리 필요 → 현재 로컬 저장 (S3 Backend 미적용)
- HCL 학습 비용 발생 (팀원 1명이 담당)
- 상태 파일 불일치 시 `terraform import` 또는 수동 동기화 필요
- 단일 `main.tf`에 모든 리소스 정의 → 모듈 분리 리팩토링 필요

### 향후 개선 방향

1. **모듈 분리**: 네트워크, 컴퓨팅, 데이터베이스, 스토리지 모듈로 분리
2. **환경 분리**: `environments/dev/`, `environments/prod/` 워크스페이스
3. **S3 Backend**: 상태 파일을 S3 + DynamoDB Lock으로 관리

### 트레이드오프 요약

```
인프라 코드화 + 변경 추적 + 재현성  ←→  상태 파일 관리 부담 + HCL 학습 곡선
```
