# CargoTrack App

Application source code for the CargoTrack Logistics Platform — a microservices-based shipment tracking and compliance system.

## Repository Structure

```
cargotrack-app/
├── services/
│   ├── core-service/       # Auth, shipments CRUD, admin, reports (Node.js/TypeScript)
│   ├── ai-service/         # Bedrock compliance agent, risk scoring, Textract OCR (Node.js/TypeScript)
│   └── document-service/   # S3 document upload/download, metadata (Node.js/TypeScript)
├── frontend/               # Next.js dashboard UI
├── .github/
│   └── workflows/
│       ├── build.yml       # Lint → SAST → Trivy scan → ECR push
│       ├── deploy.yml      # Helm tag update → ArgoCD sync → smoke tests
│       └── (terraform-apply.yml lives in cargotrack-infra)
├── docker-compose.yml      # Local development
├── sonar-project.properties
└── .env.example
```

## Related Repositories

| Repo | Purpose |
|---|---|
| [cargotrack-infra](https://github.com/CargoTrack-Org/cargotrack-infra) | Terraform — AWS EKS, RDS, S3, SQS, IAM, IRSA |
| [cargotrack-helm](https://github.com/CargoTrack-Org/cargotrack-helm) | Helm charts — Kubernetes deployment definitions |
| [cargotrack-gitops](https://github.com/CargoTrack-Org/cargotrack-gitops) | ArgoCD Application manifests |

## CI/CD Flow

```
Push to main
  → build.yml: SonarQube SAST + Snyk SCA + Docker build + Trivy scan + ECR push
  → deploy.yml: Update image tag in cargotrack-helm → ArgoCD auto-syncs → smoke tests
```

## Required GitHub Secrets

| Secret | Description |
|---|---|
| `AWS_ECR_PUSH_ROLE_ARN` | IAM role ARN for OIDC ECR push (from terraform output) |
| `SONAR_TOKEN` | SonarQube authentication token |
| `SONAR_HOST_URL` | SonarQube server URL |
| `SNYK_TOKEN` | Snyk authentication token |
| `HELM_REPO_TOKEN` | GitHub PAT or App token for cross-repo commit to cargotrack-helm |

## Technology Stack

- **Runtime**: Node.js 20 + TypeScript
- **AI**: Amazon Bedrock Nova Lite (compliance agent), Amazon Textract (OCR)
- **Database**: PostgreSQL via Prisma ORM
- **Messaging**: Amazon EventBridge + SQS
- **Storage**: Amazon S3
- **Container registry**: Amazon ECR
