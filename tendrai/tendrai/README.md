# TendrAI

Webová aplikace pro malé firmy v Česku — automaticky sleduje veřejné zakázky z NIPEZ/NEN,
hodnotí je AI proti profilu firmy a posílá upozornění.

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

## Zdroj dat

Zakázky se stahují z NIPEZ API: `https://api.isd.nipez.cz/v2/zakazky`
Scheduler běží každé 2 hodiny a automaticky notifikuje firmy, jejichž profil odpovídá novým zakázkám.
