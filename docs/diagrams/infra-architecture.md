# 인프라 아키텍처 다이어그램

> ADR 참조: [ADR-007 Terraform IaC](../adr/ADR-007-terraform-iac.md), [ADR-001 SFU/LiveKit](../adr/ADR-001-sfu-livekit.md)

## AWS 프로덕션 아키텍처

```mermaid
graph TB
    subgraph Internet["인터넷"]
        Mobile["📱 모바일 앱<br/>(React Native + Expo)"]
        Edge["🔥 엣지 디바이스<br/>(Raspberry Pi 5)"]
        Dev["💻 개발자"]
    end

    subgraph AWS["AWS (us-west-2, 오레곤)"]
        subgraph VPC["VPC"]
            subgraph PublicSubnet["Public Subnet"]
                Bastion["🖥️ Bastion EC2<br/>Terraform 실행 환경<br/>IAM Role 자동 상속"]

                subgraph APIServer["EC2: API Server (t3.medium)"]
                    SpringBoot["Spring Boot 3.5<br/>:8080"]
                    RedisLocal["Redis 7.0<br/>:6379<br/>(Docker)"]
                end

                subgraph LiveKitServer["EC2: LiveKit Server (m5.xlarge)"]
                    LiveKit["LiveKit SFU<br/>:7880 (WebSocket)<br/>:7881 (RTC)"]
                    Egress["LiveKit Egress<br/>(Chrome Headless)"]
                    RedisLK["Redis<br/>(LiveKit 내부용)"]
                end
            end

            subgraph PrivateSubnet["Private Subnet"]
                RDS["🗄️ RDS PostgreSQL 15<br/>db.t4g.micro<br/>:5432<br/>(20GB)"]
            end
        end

        S3["📦 S3 Bucket<br/>녹화 영상 저장<br/>(퍼블릭 접근 차단)"]
        ECR["🐳 ECR<br/>api-server<br/>livekit-server"]
    end

    subgraph External["외부 서비스"]
        FCM["🔔 Firebase FCM"]
        Google["🔑 Google OAuth2"]
        Kakao["🔑 Kakao OAuth2"]
    end

    %% 연결선
    Mobile -->|"HTTPS :8080"| SpringBoot
    Mobile -->|"WebRTC :7881"| LiveKit
    Edge -->|"HTTP POST<br/>/embedded/fire-event/publish"| SpringBoot
    Edge -->|"WebRTC 발행"| LiveKit
    Dev -->|"SSH :22"| Bastion

    SpringBoot -->|"JDBC :5432"| RDS
    SpringBoot -->|"Lettuce :6379"| RedisLocal
    SpringBoot -->|"REST API"| LiveKit
    SpringBoot -->|"FCM 푸시"| FCM
    SpringBoot -->|"토큰 검증"| Google
    SpringBoot -->|"토큰 검증"| Kakao

    LiveKit -->|"Egress 녹화"| Egress
    Egress -->|"MP4 업로드"| S3
    SpringBoot -->|"Presigned URL"| S3

    ECR -.->|"Docker Pull"| APIServer
    ECR -.->|"Docker Pull"| LiveKitServer

    Bastion -.->|"terraform apply"| VPC
```

## 보안 그룹 관계

```mermaid
graph LR
    subgraph SG_API["API Server SG"]
        direction TB
        API_IN1["Inbound: 8080/tcp<br/>— 0.0.0.0/0"]
        API_IN2["Inbound: 22/tcp<br/>— Bastion IP만"]
    end

    subgraph SG_LK["LiveKit Server SG"]
        direction TB
        LK_IN1["Inbound: 7880/tcp<br/>— 0.0.0.0/0"]
        LK_IN2["Inbound: 7881/udp<br/>— 0.0.0.0/0"]
        LK_IN3["Inbound: 22/tcp<br/>— Bastion IP만"]
    end

    subgraph SG_RDS["RDS SG"]
        direction TB
        RDS_IN["Inbound: 5432/tcp<br/>— API Server SG만"]
    end

    SG_API -->|"PostgreSQL 접근"| SG_RDS
    SG_LK -.->|"RDS 접근 불가"| SG_RDS
```

## 로컬 개발 환경 (Docker Compose)

```mermaid
graph TB
    subgraph Docker["Docker Compose (로컬)"]
        API_Local["🖥️ api-server<br/>Spring Boot :8080"]
        PG["🗄️ PostgreSQL 15<br/>:5432"]
        Redis_Local["💾 Redis 7<br/>:6379"]
        LK_Local["📡 LiveKit SFU<br/>:7880 / :7881"]
        Egress_Local["🎬 LiveKit Egress"]
        MinIO["📦 MinIO<br/>:9000 (S3 호환)"]
    end

    subgraph Local["로컬 머신"]
        App_Local["📱 Expo Dev Server"]
        Edge_Local["🔥 엣지 시뮬레이터<br/>(simulator.py)"]
    end

    App_Local --> API_Local
    App_Local --> LK_Local
    Edge_Local --> API_Local
    Edge_Local --> LK_Local

    API_Local --> PG
    API_Local --> Redis_Local
    API_Local --> LK_Local
    Egress_Local --> MinIO

    style Docker fill:#e8f5e9,stroke:#2e7d32
    style Local fill:#e3f2fd,stroke:#1565c0
```

## 리소스 사양 및 비용

| 리소스           | 사양                       | 월 비용 (추정) | 비고                |
| ---------------- | -------------------------- | -------------- | ------------------- |
| EC2 (API Server) | t3.medium (2 vCPU, 4GB)    | ~$30           | Spring Boot + Redis |
| EC2 (LiveKit)    | m5.xlarge (4 vCPU, 16GB)   | ~$140          | WebRTC CPU 집약적   |
| RDS              | db.t4g.micro (2 vCPU, 1GB) | ~$15           | PostgreSQL 15, 20GB |
| S3               | Standard                   | ~$1            | 녹화 영상 저장      |
| ECR              | 2 레포                     | ~$1            | Docker 이미지       |
| 데이터 전송      | -                          | ~$10           | WebRTC 트래픽       |
| **합계**         |                            | **~$197**      |                     |

## CI/CD 파이프라인

```mermaid
graph LR
    subgraph GitHub["GitHub"]
        Push["dev 브랜치 Push"]
        PR["main 브랜치 PR"]
    end

    subgraph Actions["GitHub Actions"]
        CI["CI<br/>Gradle Build + Test"]
        CD["Dev CD<br/>Docker Build"]
    end

    subgraph AWS_Deploy["AWS"]
        ECR_D["ECR<br/>이미지 Push"]
        SSM["SSM<br/>docker pull + restart"]
        EC2_D["EC2<br/>컨테이너 배포"]
    end

    Push --> CI
    Push --> CD
    PR --> CI
    CD --> ECR_D
    ECR_D --> SSM
    SSM --> EC2_D

    style GitHub fill:#f5f5f5,stroke:#333
    style Actions fill:#fff3e0,stroke:#e65100
    style AWS_Deploy fill:#e8eaf6,stroke:#283593
```

### CI/CD 인증

- **OIDC 기반**: GitHub Actions → AWS IAM Role (`inha-capstone-04-cicd-role`)
- 시크릿 키 없이 임시 자격 증명으로 ECR Push + SSM 명령 실행
