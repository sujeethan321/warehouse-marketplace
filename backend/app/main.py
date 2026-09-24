# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, spaces, rentals, imports, reports

app = FastAPI(title="Warehouse Marketplace API")

# Setup CORS so your React frontend can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update with frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(spaces.router)
app.include_router(rentals.router)
app.include_router(imports.router)
app.include_router(reports.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend running on Vercel!"}