from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, imports, rentals, reports, spaces

app = FastAPI(title="StoreShare - Shared Warehouse Capacity Marketplace", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
# imports must be registered before spaces so "/api/spaces/import" is never read as "/api/spaces/{id}"
app.include_router(imports.router)
app.include_router(spaces.router)
app.include_router(rentals.router)
app.include_router(rentals.owner_router)
app.include_router(reports.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
