# TendrAI

Webová aplikace pro malé firmy v Česku — automaticky sleduje veřejné zakázky z NIPEZ/NEN,
hodnotí je AI proti profilu firmy a posílá upozornění.

## Rychlý start (Docker)

```bash
# 1. Klonuj nebo rozbal projekt
cd tendrai

# 2. Nastav proměnné prostředí
cp .env.example .env
# Otevři .env a vyplň ANTHROPIC_API_KEY

# 3. Spusť vše jedním příkazem
docker compose up --build

# Aplikace běží na:
# Frontend:  http://localhost:5173
# API docs:  http://localhost:8000/docs
```

## Manuální start (bez Dockeru)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Nastav proměnné (nebo vytvoř .env)
export DATABASE_URL=postgresql://tendrai:tendrai@localhost/tendrai
export ANTHROPIC_API_KEY=sk-ant-...
export JWT_SECRET=nejake-tajne-heslo

# Vytvoř DB (PostgreSQL musí běžet)
createdb tendrai

# Spusť API server
uvicorn main:app --reload --port 8000

# V druhém terminálu spusť scheduler (sync NIPEZ každé 2h)
python scheduler.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Otevři http://localhost:5173
```

## Proměnné prostředí

| Proměnná | Popis | Výchozí |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://tendrai:tendrai@localhost/tendrai` |
| `ANTHROPIC_API_KEY` | Klíč pro Claude API | povinné |
| `JWT_SECRET` | Tajný klíč pro JWT tokeny | `change-me-in-production` |

## Struktura projektu

```
tendrai/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLAlchemy setup
│   ├── models.py            # DB modely (Company, Tender, ...)
│   ├── scheduler.py         # Periodický sync NIPEZ (spustit samostatně)
│   ├── routers/
│   │   ├── auth.py          # POST /api/auth/register, /login, GET /me
│   │   ├── tenders.py       # GET/POST /api/tenders/...
│   │   ├── companies.py     # PUT /api/companies/profile
│   │   └── notifications.py # GET /api/notifications/
│   └── services/
│       ├── nipez.py         # Fetch z api.isd.nipez.cz
│       └── ai_scorer.py     # Claude AI scoring + průvodní dopisy
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx    # Hlavní přehled zakázek
        │   ├── TenderDetail.jsx # Detail + AI analýza
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   └── Profile.jsx      # Profil firmy + nastavení
        ├── components/
        │   ├── AuthContext.jsx  # Global auth state
        │   └── Sidebar.jsx
        └── api/client.js        # Axios API client
```

## API endpointy

```
POST   /api/auth/register          Registrace firmy
POST   /api/auth/login             Přihlášení
GET    /api/auth/me                Aktuální firma

GET    /api/tenders/               Seznam zakázek (filtry: q, region, category)
GET    /api/tenders/{id}           Detail zakázky
POST   /api/tenders/{id}/analyze   AI analýza (volá Claude)
POST   /api/tenders/{id}/save      Uložit/odebrat
POST   /api/tenders/{id}/status    Změna stavu (saved/applied/won/lost)
POST   /api/tenders/sync           Spustit sync NIPEZ na pozadí

GET    /api/notifications/         Seznam upozornění
POST   /api/notifications/read-all Označit vše jako přečtené

PUT    /api/companies/profile      Aktualizace profilu firmy
```

## Produkce

Pro produkci nastav:
- `JWT_SECRET` na dlouhý náhodný řetězec
- PostgreSQL na bezpečném serveru
- Nginx reverse proxy s SSL (Let's Encrypt)
- Automatický restart scheduleru (systemd nebo supervisor)

## Zdroj dat

Zakázky se stahují z NIPEZ API: `https://api.isd.nipez.cz/v2/zakazky`
Scheduler běží každé 2 hodiny a automaticky notifikuje firmy, jejichž profil odpovídá novým zakázkám.
