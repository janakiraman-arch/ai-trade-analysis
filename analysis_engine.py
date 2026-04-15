import os
import time
import random
import requests
from typing import List, Dict
from datetime import datetime, timezone

# ─────────────────────────────────────────────────────────────────────────────
#  Live market data helpers
#  • Crypto  → CoinGecko (free, no API key)
#  • Stocks  → Yahoo Finance v8 (free, no API key)
# ─────────────────────────────────────────────────────────────────────────────

COINGECKO_IDS = {
    "BTC/USDT": "bitcoin",
    "ETH/USDT": "ethereum",
}

YAHOO_SYMBOLS = {
    "AAPL": "AAPL",
    "TSLA": "TSLA",
    "NVDA": "NVDA",
}

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ApexAI/1.0)"
}


def _fetch_crypto_candles(coin_id: str, days: int = 1) -> List[Dict]:
    """Fetch OHLC candles from CoinGecko (free, no key needed).
    Returns 48 × 30-minute candles for days=1.
    """
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc"
    params = {"vs_currency": "usd", "days": days}
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    raw = resp.json()  # [[timestamp_ms, open, high, low, close], ...]
    candles = []
    for row in raw:
        candles.append({
            "time":  row[0] // 1000,
            "open":  row[1],
            "high":  row[2],
            "low":   row[3],
            "close": row[4],
        })
    # Sort ascending (CoinGecko returns ascending already, but be safe)
    candles.sort(key=lambda x: x["time"])
    return candles


def _fetch_crypto_price(coin_id: str) -> float:
    """Fetch current price for a crypto asset from CoinGecko."""
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {"ids": coin_id, "vs_currencies": "usd"}
    resp = requests.get(url, params=params, timeout=8)
    resp.raise_for_status()
    return float(resp.json()[coin_id]["usd"])


def _fetch_stock_candles(symbol: str) -> List[Dict]:
    """Fetch 1-day 5-minute candles from Yahoo Finance v8 (no key needed)."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {
        "interval":  "5m",
        "range":     "1d",
        "includePrePost": "false",
    }
    resp = requests.get(url, params=params, headers=YAHOO_HEADERS, timeout=10)
    resp.raise_for_status()
    chart = resp.json()["chart"]["result"][0]
    timestamps = chart["timestamp"]
    quotes = chart["indicators"]["quote"][0]
    candles = []
    for i, ts in enumerate(timestamps):
        o = quotes["open"][i]
        h = quotes["high"][i]
        l = quotes["low"][i]
        c = quotes["close"][i]
        if None in (o, h, l, c):
            continue
        candles.append({
            "time":  ts,
            "open":  round(o, 2),
            "high":  round(h, 2),
            "low":   round(l, 2),
            "close": round(c, 2),
        })
    return candles


def _fetch_stock_price(symbol: str) -> float:
    """Fetch current price for a stock from Yahoo Finance."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"interval": "1m", "range": "1d"}
    resp = requests.get(url, params=params, headers=YAHOO_HEADERS, timeout=8)
    resp.raise_for_status()
    chart = resp.json()["chart"]["result"][0]
    meta = chart.get("meta", {})
    return float(meta.get("regularMarketPrice", 0))


# ─────────────────────────────────────────────────────────────────────────────
#  Main Engine
# ─────────────────────────────────────────────────────────────────────────────

class TradeAnalysisEngine:
    def __init__(self):
        self.assets = ["BTC/USDT", "ETH/USDT", "AAPL", "TSLA", "NVDA", "FOREX:EUR/USD"]
        self.market_sentiment = 0.65  # 0 to 1 (Bullish)
        self.current_states: Dict = {}  # Tracks last close/time per asset

    # ── Sentiment ────────────────────────────────────────────────────────────

    def get_market_sentiment(self) -> Dict:
        """Random-walk sentiment (NLP simulation)."""
        self.market_sentiment = max(0.1, min(0.9,
            self.market_sentiment + random.uniform(-0.05, 0.05)))

        status = "Neutral"
        if   self.market_sentiment > 0.7: status = "Strong Bullish"
        elif self.market_sentiment > 0.6: status = "Bullish"
        elif self.market_sentiment < 0.3: status = "Strong Bearish"
        elif self.market_sentiment < 0.4: status = "Bearish"

        return {
            "score":     round(self.market_sentiment, 2),
            "status":    status,
            "timestamp": time.time(),
        }

    # ── AI Signals ───────────────────────────────────────────────────────────

    def get_ai_signals(self) -> List[Dict]:
        """Generate AI trade signals for all assets."""
        signals = []
        for asset in self.assets:
            confidence = random.uniform(0.4, 0.95)
            action = "HOLD"
            if confidence > 0.8:
                action = random.choice(["BUY", "SELL"])
            elif confidence > 0.7:
                action = random.choice(["BUY", "SELL", "HOLD"])

            signals.append({
                "asset":      asset,
                "action":     action,
                "confidence": round(confidence * 100, 1),
                "reason":     self._generate_reason(asset, action),
            })
        return signals

    def _generate_reason(self, asset: str, action: str) -> str:
        if action == "HOLD":
            return "Consolidation pattern detected. RSI is neutral."

        buy_reasons = [
            "Golden Cross on 4H timeframe.",
            "Significant volume spike at support level.",
            "Bullish divergence on MACD indicator.",
            "Institutional accumulation detected in order flow.",
            "Breakout above 200-day moving average.",
            "Strong Fibonacci retracement support at 0.618.",
        ]
        sell_reasons = [
            "Bearish engulfing candle on daily chart.",
            "Death Cross on 1H timeframe.",
            "RSI indicates overbought conditions (>75).",
            "High sell-side pressure in the depth chart.",
            "Failure to break key resistance level.",
            "Negative divergence on Money Flow Index.",
        ]
        return random.choice(buy_reasons if action == "BUY" else sell_reasons)

    # ── Price Data ───────────────────────────────────────────────────────────

    def get_mock_price_data(self, asset: str) -> List[Dict]:
        """Return real OHLC candles; fall back to mock data on any error."""
        try:
            candles = self._fetch_live_candles(asset)
            # Cache last close for tick continuity
            if candles:
                self.current_states[asset] = {
                    "last_close": candles[-1]["close"],
                    "last_time":  candles[-1]["time"],
                }
            return candles
        except Exception as exc:
            print(f"[APEX] Live data failed for {asset}: {exc} → using mock data")
            return self._generate_mock_candles(asset)

    def get_latest_tick(self, asset: str) -> Dict:
        """Return a live price tick; fall back to simulated tick on error."""
        # Ensure we have a baseline state
        if asset not in self.current_states:
            self.get_mock_price_data(asset)

        try:
            live_price = self._fetch_live_price(asset)
            prev_price = self.current_states[asset]["last_close"]
            factor = 0.001
            open_p  = prev_price
            close_p = live_price
            high_p  = max(open_p, close_p) * (1 + random.uniform(0, factor))
            low_p   = min(open_p, close_p) * (1 - random.uniform(0, factor))
            current_time = int(time.time())
            self.current_states[asset] = {
                "last_close": close_p,
                "last_time":  current_time,
            }
            return {
                "time":  current_time,
                "open":  round(open_p, 2),
                "high":  round(high_p, 2),
                "low":   round(low_p, 2),
                "close": round(close_p, 2),
            }
        except Exception as exc:
            print(f"[APEX] Live tick failed for {asset}: {exc} → using simulated tick")
            return self._generate_simulated_tick(asset)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _fetch_live_candles(self, asset: str) -> List[Dict]:
        if asset in COINGECKO_IDS:
            return _fetch_crypto_candles(COINGECKO_IDS[asset], days=1)
        if asset in YAHOO_SYMBOLS:
            return _fetch_stock_candles(YAHOO_SYMBOLS[asset])
        # Unsupported asset (e.g. FOREX) → raise so caller falls back to mock
        raise ValueError(f"No live data source for {asset}")

    def _fetch_live_price(self, asset: str) -> float:
        if asset in COINGECKO_IDS:
            return _fetch_crypto_price(COINGECKO_IDS[asset])
        if asset in YAHOO_SYMBOLS:
            return _fetch_stock_price(YAHOO_SYMBOLS[asset])
        raise ValueError(f"No live price source for {asset}")

    def _generate_mock_candles(self, asset: str) -> List[Dict]:
        """Fallback: generate synthetic OHLC candles."""
        current_time = int(time.time())
        data = []
        price = 65000 if "BTC" in asset else (3500 if "ETH" in asset else 200)

        for i in range(100):
            t = current_time - (100 - i) * 3600
            change  = price * random.uniform(-0.02, 0.02)
            open_p  = price
            close_p = price + change
            high_p  = max(open_p, close_p) + abs(change) * random.uniform(0.1, 0.5)
            low_p   = min(open_p, close_p) - abs(change) * random.uniform(0.1, 0.5)

            data.append({
                "time":  t,
                "open":  round(open_p, 2),
                "high":  round(high_p, 2),
                "low":   round(low_p, 2),
                "close": round(close_p, 2),
            })
            price = close_p

        self.current_states[asset] = {
            "last_close": price,
            "last_time":  current_time,
        }
        return data

    def _generate_simulated_tick(self, asset: str) -> Dict:
        """Fallback: generate a synthetic price tick from last known state."""
        state   = self.current_states[asset]
        price   = state["last_close"]
        factor  = 0.002
        change  = price * random.uniform(-factor, factor)
        open_p  = price
        close_p = price + change
        high_p  = max(open_p, close_p) + abs(change) * random.uniform(0.1, 0.3)
        low_p   = min(open_p, close_p) - abs(change) * random.uniform(0.1, 0.3)
        current_time = int(time.time())

        self.current_states[asset]["last_close"] = close_p
        self.current_states[asset]["last_time"]  = current_time

        return {
            "time":  current_time,
            "open":  round(open_p, 2),
            "high":  round(high_p, 2),
            "low":   round(low_p, 2),
            "close": round(close_p, 2),
        }


engine = TradeAnalysisEngine()
