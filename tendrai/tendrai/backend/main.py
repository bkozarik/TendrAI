from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tenders, companies, notifications, auth
from database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TendrAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(tenders.router, prefix="/api/tenders", tags=["tenders"])
app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "TendrAI"}
