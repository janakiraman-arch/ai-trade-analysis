from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from analysis_engine import engine
import os

app = FastAPI(title="Apex AI Trade Analysis")

HTML_CACHE_CONTROL = "public, max-age=0, must-revalidate"
STATIC_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800"
API_CACHE_CONTROL = "no-store"

app.add_middleware(GZipMiddleware, minimum_size=500)


@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path

    if path.startswith("/static/"):
        response.headers.setdefault("Cache-Control", STATIC_CACHE_CONTROL)
    elif path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", API_CACHE_CONTROL)
    elif path in {"/", "/dashboard"}:
        response.headers.setdefault("Cache-Control", HTML_CACHE_CONTROL)

    return response

# Serve static files
static_path = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(static_path, "index.html"))

@app.get("/dashboard")
async def read_dashboard():
    return FileResponse(os.path.join(static_path, "dashboard.html"))

@app.get("/api/sentiment")
async def get_sentiment():
    return engine.get_market_sentiment()

@app.get("/api/signals")
async def get_signals():
    return engine.get_ai_signals()

@app.get("/api/chart/{asset}")
async def get_chart_data(asset: str):
    # Normalize asset name for URL
    asset = asset.replace("_", "/")
    data = engine.get_mock_price_data(asset)
    return data

@app.get("/api/tick/{asset}")
async def get_tick(asset: str):
    asset = asset.replace("_", "/")
    return engine.get_latest_tick(asset)

@app.get("/api/health")
async def health_check():
    return {"status": "online", "engine": "APEX-v1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
