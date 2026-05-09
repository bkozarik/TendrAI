<div align="center">
  <br/>
  <h1>TendrAI</h1>
  <p><strong>Find the contracts you can win — before your competitors do.</strong></p>
  <p>
    AI-powered public tender discovery for small Czech businesses.<br/>
    Built on top of the official NIPEZ procurement API and Anthropic Claude.
  </p>

  <br/>

  ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
  ![Claude](https://img.shields.io/badge/Claude_Sonnet-AI-D97757?style=flat-square)
  ![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)

  <br/><br/>
</div>

---

## The problem

The Czech public procurement registry publishes thousands of tenders every week. A small construction firm or regional IT company has no dedicated procurement team — so they rely on luck, word of mouth, or a manual browse through government portals once a month. They miss contracts they are perfectly positioned to win.

No existing Czech tool combines automatic monitoring, company-profile matching, and AI-powered qualification analysis in one place. TendrAI fills that gap.

---

## The idea

TendrAI is a **profile-driven tender radar**. A company registers once — filing their trade categories, CPV codes, regions, employee count, and typical contract size. From that point on, TendrAI does the work:

1. **Monitors** the NIPEZ API continuously and ingests every new public tender
2. **Filters** the full feed down to tenders that actually match the company's profile
3. **Scores** each match using Claude AI — analyzing the full procurement text, not just metadata
4. **Alerts** the company the moment something relevant appears, and again 3 days before the deadline
5. **Tracks** the company's applications from first save through submission to outcome

The core insight is that matching a tender to a company is not a keyword search problem — it requires understanding procurement language, qualification clauses, and delivery constraints. That's exactly the kind of reasoning Claude does well.

---

## How the AI layer works

When a user requests analysis of a tender, TendrAI sends the full tender description alongside the company's profile to Claude Sonnet and asks for structured output:

```json
{
  "score": 87,
  "match_reason": "Strong CPV alignment. Contract value is within your typical range.",
  "requirements": [
    "ISO 9001 certification",
    "3 reference projects of similar scope",
    "Bank guarantee — 5% of contract value"
  ],
  "risks": [
    "45-day delivery window is tight for this scope",
    "Joint-venture clause may apply above 5M CZK"
  ],
  "recommendation": "apply",
  "cover_letter_hint": "Lead with your completed road-surface projects in Prague 9."
}
```

The score is a 0–100 fit estimate based on category alignment, regional match, company size vs. contract complexity, and qualification requirements. The `requirements` array surfaces what the company must actually prove to qualify. The `cover_letter_hint` gives the single strongest argument to open their bid with.

This is not retrieval-augmented search — it is a **reasoning pass over the full document** on demand, per company, per tender.

---

## Data model

```
Company
  ├── ico, name, email, password_hash
  ├── employee_count, annual_revenue_czk
  ├── regions[]          — which Czech regions they operate in
  ├── categories[]       — trade labels (Stavebnictví, IT, Úklid, …)
  └── notification prefs — email, Telegram chat ID

Tender                   — sourced from NIPEZ, one row per procurement notice
  ├── title, contracting_authority
  ├── value_czk, deadline
  ├── region, cpv_code, cpv_name
  ├── procedure_type, description
  └── url                — canonical link back to NIPEZ/NEN

SavedTender              — join between Company and Tender
  ├── ai_score           — 0–100, written on first analysis
  ├── ai_analysis        — full JSON blob from Claude
  ├── status             — saved | applied | won | lost
  └── notes

Notification
  ├── type               — new_match | deadline | result
  ├── message
  └── is_read
```

The `SavedTender` table is the core working surface — it holds the AI output alongside the user's own application state, keeping the two cleanly separated from the raw procurement data.

---

## System architecture

```
                        ┌─────────────────────┐
                        │   NIPEZ REST API     │
                        │ api.isd.nipez.cz/v2  │
                        └──────────┬──────────┘
                                   │ every 2 hours
                        ┌──────────▼──────────┐
                        │     Scheduler        │
                        │  fetch → dedup →     │
                        │  notify matching     │
                        │  companies           │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │     PostgreSQL       │
                        │  companies           │
                        │  tenders             │
                        │  saved_tenders       │
                        │  notifications       │
                        └──────────┬──────────┘
                                   │
                   ┌───────────────▼───────────────┐
                   │         FastAPI                │
                   │  auth · tenders · companies    │
                   │  notifications                 │
                   └───────────┬───────────────────┘
                               │           │
                   ┌───────────▼───┐  ┌────▼──────────────┐
                   │  React SPA    │  │  Anthropic Claude  │
                   │  Dashboard    │  │  (on-demand, per   │
                   └───────────────┘  │   tender analysis) │
                                      └────────────────────┘
```

The scheduler and the API server are separate processes — the scheduler runs as a background daemon and writes directly to PostgreSQL; the API never waits on sync. Claude is called only when a user explicitly requests analysis, keeping API costs proportional to actual usage.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| **API** | FastAPI + Uvicorn | async-native, automatic OpenAPI docs, fast to iterate |
| **ORM** | SQLAlchemy 2.0 | mature, works well with PostgreSQL JSON columns |
| **Database** | PostgreSQL 16 | JSONB for AI output, reliable, self-hostable |
| **Auth** | JWT + bcrypt | stateless, works across separate frontend/backend origins |
| **AI** | Claude Sonnet 4 | best-in-class instruction following for structured JSON output |
| **Data source** | NIPEZ REST API | official Czech procurement feed, no scraping required |
| **Frontend** | React 18 + Vite | fast dev loop, CSS Modules for scoped styles |
| **Containerisation** | Docker Compose | single-command local and production parity |
| **Reverse proxy** | Nginx | SPA routing + API proxy in one config |

---

## What makes it different

Most Czech procurement tools are either static portals that require manual searching, or expensive enterprise platforms aimed at large firms. TendrAI is built specifically for small companies:

- **Profile-first** — you describe yourself once, the system finds tenders for you
- **AI that reads documents** — not keyword matching, but actual comprehension of qualification requirements
- **Deadline-aware** — reminders built into the data model, not bolted on
- **Self-hostable** — a company can run their own instance; no SaaS lock-in
- **Open data** — all procurement data comes from the official public API, not scraped or licensed

---

<div align="center">

</div>
