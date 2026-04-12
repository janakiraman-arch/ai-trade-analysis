import random
import time
from typing import List, Dict

class TradeAnalysisEngine:
    def __init__(self):
        self.assets = ["BTC/USDT", "ETH/USDT", "AAPL", "TSLA", "NVDA", "FOREX:EUR/USD"]
        self.market_sentiment = 0.65  # 0 to 1 (Bullish)
        self.current_states = {} # Tracks last close/time per asset

    def get_market_sentiment(self) -> Dict:
        """Simulates NLP sentiment analysis from news and social media."""
        # Add some random walk to sentiment
        self.market_sentiment = max(0.1, min(0.9, self.market_sentiment + random.uniform(-0.05, 0.05)))
        
        status = "Neutral"
        if self.market_sentiment > 0.7: status = "Strong Bullish"
        elif self.market_sentiment > 0.6: status = "Bullish"
        elif self.market_sentiment < 0.3: status = "Strong Bearish"
        elif self.market_sentiment < 0.4: status = "Bearish"

        return {
            "score": round(self.market_sentiment, 2),
            "status": status,
            "timestamp": time.time()
        }

    def get_ai_signals(self) -> List[Dict]:
        """Generates AI trade signals based on technical indicators and volume."""
        signals = []
        for asset in self.assets:
            confidence = random.uniform(0.4, 0.95)
            action = "HOLD"
            if confidence > 0.8:
                action = random.choice(["BUY", "SELL"])
            elif confidence > 0.7:
                action = random.choice(["BUY", "SELL", "HOLD"])
            
            signals.append({
                "asset": asset,
                "action": action,
                "confidence": round(confidence * 100, 1),
                "reason": self._generate_reason(asset, action)
            })
        return signals

    def _generate_reason(self, asset, action) -> str:
        if action == "HOLD":
            return "Consolidation pattern detected. Relative Strength Index (RSI) is neutral."
        
        reasons = [
            "Golden Cross on 4H timeframe.",
            "Significant volume spike observed at support level.",
            "Bullish divergence on MACD indicator.",
            "Institutional accumulation detected in order flow.",
            "Breakout above 200-day moving average.",
            "Strong Fibonacci retracement support at 0.618."
        ] if action == "BUY" else [
            "Bearish engulfing candle on daily chart.",
            "Death Cross on 1H timeframe.",
            "RSI indicates overbought conditions (>75).",
            "High sell-side pressure in the depth chart.",
            "Failure to break key resistance level.",
            "Negative divergence on Money Flow Index."
        ]
        return random.choice(reasons)

    def get_mock_price_data(self, asset: str) -> List[Dict]:
        """Generates historical-looking candlestick data for charts."""
        current_time = int(time.time())
        data = []
        price = 65000 if "BTC" in asset else (3500 if "ETH" in asset else 200)
        
        for i in range(100):
            t = current_time - (100 - i) * 3600 # Hourly
            change = price * random.uniform(-0.02, 0.02)
            open_p = price
            close_p = price + change
            high_p = max(open_p, close_p) + (abs(change) * random.uniform(0.1, 0.5))
            low_p = min(open_p, close_p) - (abs(change) * random.uniform(0.1, 0.5))
            
            data.append({
                "time": t,
                "open": round(open_p, 2),
                "high": round(high_p, 2),
                "low": round(low_p, 2),
                "close": round(close_p, 2)
            })
            price = close_p
        
        # Save state for real-time continuity
        self.current_states[asset] = {
            "last_close": price,
            "last_time": current_time
        }
            
        return data

    def get_latest_tick(self, asset: str) -> Dict:
        """Generates a new data point or updates the existing one for real-time feel."""
        if asset not in self.current_states:
            self.get_mock_price_data(asset)
            
        state = self.current_states[asset]
        price = state["last_close"]
        
        # Volatility factor based on price
        factor = 0.002
        change = price * random.uniform(-factor, factor)
        
        open_p = price
        close_p = price + change
        high_p = max(open_p, close_p) + (abs(change) * random.uniform(0.1, 0.3))
        low_p = min(open_p, close_p) - (abs(change) * random.uniform(0.1, 0.3))
        
        # We simulate a "new candle" every 60 seconds (or just return same time for live wicks)
        current_time = int(time.time())
        
        self.current_states[asset]["last_close"] = close_p
        self.current_states[asset]["last_time"] = current_time
        
        return {
            "time": current_time,
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2)
        }

engine = TradeAnalysisEngine()
