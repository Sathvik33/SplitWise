from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.config import settings
from app.routers import auth, groups, expenses, payments, dashboard, messages, import_router

app = FastAPI(title="Splitwise API")

os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(payments.router)
app.include_router(messages.router)
app.include_router(import_router.router)

@app.get("/")
async def root():
    return {"message": "Splitwise API"}
