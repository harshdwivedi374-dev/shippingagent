 Demo link= https://drive.google.com/file/d/1fdhTiI303ZhvQXPLLdfc_UIZo2SgJK3t/view?usp=sharing



# Agentic Shipping Automation Backend

An elite multi-agent shipping system that outperforms competitors through autonomous decision-making, self-healing exception management, and human-in-the-loop governance.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI REST API                          │
│  /shipments  /agents  /escalations  /tracking  /documents   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              LangGraph Orchestrator                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │  Compliance │→ │   Router    │→ │   Negotiator     │    │
│  │   Agent     │  │   Agent     │  │   Agent          │    │
│  └─────────────┘  └─────────────┘  └──────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Exception Agent (Self-Healer)              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   PostgreSQL        Redis         ChromaDB
   (Shipments)    (Cache/Queue)  (Vector Memory)
```

## Agent Confidence System

| Confidence | Disposition | Action |
|---|---|---|
| ≥ 95% | `auto_execute` | Agent executes autonomously |
| 70–95% | `escalate_to_human` | Human picks from 3 pre-calculated options |
| < 70% | `reject` | Manual intervention required |

## Quick Start

### 1. Configure environment
```bash
cp .env.example .env
# Edit .env with your API keys (Google Gemini, EasyPost, Shippo, etc.)
```

### 2. Start all services
```bash
docker-compose up -d
```

### 3. Run migrations
```bash
docker-compose exec api alembic upgrade head
```

### 4. Seed initial data
```bash
docker-compose exec api python scripts/seed_data.py
```

### 5. Access the API
- **API Docs**: http://localhost:8000/docs
- **Celery Monitor**: http://localhost:5555
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Authentication
```
POST /api/v1/auth/register    — Create user
POST /api/v1/auth/login       — Get JWT tokens
```

### Shipments
```
POST /api/v1/shipments/                        — Create shipment (triggers agent workflow)
GET  /api/v1/shipments/                        — List shipments
GET  /api/v1/shipments/{id}                    — Get shipment
GET  /api/v1/shipments/{id}/reasoning          — Get agent reasoning log
```

### Agents (Direct Access)
```
POST /api/v1/agents/process                    — Full workflow
POST /api/v1/agents/compliance/check           — Compliance check only
POST /api/v1/agents/rates/quote                — Multi-carrier rate quotes
POST /api/v1/agents/rates/negotiate            — Spot-rate negotiation
POST /api/v1/agents/exceptions/handle          — Exception resolution
POST /api/v1/agents/sustainability/carbon      — Carbon footprint
POST /api/v1/agents/sustainability/green-routes — Green route options
```

### Human-in-the-Loop
```
GET  /api/v1/escalations/                      — List pending escalations
GET  /api/v1/escalations/{id}                  — Get escalation with options A/B/C
POST /api/v1/escalations/{id}/approve          — Human selects option
POST /api/v1/escalations/{id}/reject           — Reject escalation
```

### Tracking
```
GET /api/v1/tracking/{id}/events               — Tracking history
GET /api/v1/tracking/{id}/live                 — Live carrier tracking
GET /api/v1/tracking/{id}/exceptions           — Detected exceptions
```

### Documents & OCR
```
POST /api/v1/documents/ocr/address             — Extract address from image
POST /api/v1/documents/ocr/invoice             — Extract invoice data via OCR
POST /api/v1/documents/ocr/package-scan        — Dark warehouse package scan
GET  /api/v1/documents/shipment/{id}           — Get shipment documents
```

## Agent Features

### Router Agent
- Fetches rates from EasyPost + Shippo simultaneously
- Checks weather disruptions along the route
- Queries long-term carrier memory (ChromaDB)
- Applies Reflexion self-critique before finalizing
- Returns 2 alternatives for human review

### Compliance Agent (Zero-Trust)
- Classifies HS codes automatically
- Validates against 2026 trade regulations
- Detects sanctioned countries and dual-use goods
- Calculates duties + VAT for 10+ countries
- Generates missing invoice fields

### Negotiator Agent
- Pings multiple freight APIs simultaneously
- Detects backhaul opportunities (40-60% cheaper)
- Calculates total landed cost (rate + duties + carbon)
- Recommends negotiation strategy if over budget

### Exception Agent (Self-Healer)
- Detects: delays, weather, port congestion, customs holds, damage
- Calculates cost-benefit of re-routing vs. waiting
- Generates proactive customer messages with discount offers
- Auto-files insurance claims for damaged goods

## Background Tasks (Celery Beat)
- **Every 30 min**: Poll in-transit shipments for delays
- **Every hour**: Check and expire stale escalations
- **Daily**: Update carrier performance metrics in vector memory

## Tech Stack
- **Framework**: FastAPI + Pydantic v2
- **Agents**: LangGraph + LangChain + Gemini 1.5 Pro/Flash
- **Database**: PostgreSQL (async SQLAlchemy)
- **Cache/Queue**: Redis + Celery
- **Vector Memory**: ChromaDB
- **OCR**: Tesseract + Pillow
- **Carriers**: EasyPost, Shippo (FedEx, UPS, DHL, USPS)
- **Containers**: Docker + Docker Compose
