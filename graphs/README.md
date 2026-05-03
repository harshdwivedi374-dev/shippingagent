# 📊 Architecture Diagrams — Agentic Shipping Automation

All diagrams are written in **Mermaid** syntax. Render them in:
- GitHub / GitLab (native support)
- VS Code with the [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension
- [mermaid.live](https://mermaid.live) (paste any diagram block)

---

## Diagram Index

| # | File | What it shows |
|---|------|---------------|
| 01 | [System Architecture](./01_system_architecture.md) | Full stack overview — Frontend, Backend, Agents, Data, External services |
| 02 | [Agent Workflow](./02_agent_workflow.md) | LangGraph state machine — how agents run in sequence and make decisions |
| 03 | [Agent Interactions & Tools](./03_agent_interactions.md) | Which agent uses which tool and why |
| 04 | [Data Models (ERD)](./04_data_models.md) | All database entities and their relationships |
| 05 | [Shipment Lifecycle](./05_shipment_lifecycle.md) | State machine — every status a shipment can be in |
| 06 | [API Routes Map](./06_api_routes.md) | All REST endpoints grouped by domain |
| 07 | [Authentication Flow](./07_authentication_flow.md) | Firebase + Local JWT login sequence diagrams |
| 08 | [Exception Handling](./08_exception_handling_flow.md) | Self-healing exception detection and resolution |
| 09 | [Confidence Scoring](./09_confidence_scoring.md) | How agent confidence is calculated and dispositions assigned |
| 10 | [Frontend Architecture](./10_frontend_architecture.md) | Next.js pages, components, state, and API client |
| 11 | [Background Tasks](./11_background_tasks.md) | AsyncIO scheduler — polling, escalation expiry, metrics |
| 12 | [Memory & Learning](./12_memory_and_learning.md) | ChromaDB long-term learning — how agents improve over time |

---

## Key Concepts at a Glance

### Confidence Thresholds
| Score | Disposition | Action |
|-------|-------------|--------|
| ≥ 95% | `auto_execute` | Label purchased automatically |
| 70–95% | `escalate_to_human` | Human reviews 3 options (A/B/C) |
| < 70% | `reject` | Manual intervention required |

### Agent Pipeline Order
```
ComplianceAgent → RouterAgent → NegotiatorAgent → Finalize → Disposition
```

### Shipment Status Flow (happy path)
```
DRAFT → PENDING_AGENT → AGENT_PROCESSING → LABEL_CREATED → PICKED_UP → IN_TRANSIT → DELIVERED
```
