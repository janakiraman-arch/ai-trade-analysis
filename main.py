from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from analysis_engine import engine
import os

app = FastAPI(title="Apex AI Trade Analysis")

# Serve static files
static_path = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(static_path, "index.html"))

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
