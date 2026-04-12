console.log("APEX JS LOADING...");

document.addEventListener('DOMContentLoaded', () => {
    console.log("APEX DOM CONTENT LOADED");

    // --- Chart Initialization ---
    const chartElement = document.getElementById('price-chart');
    let chart, candleSeries;

    try {
        console.log("Creating chart...");
        chart = LightweightCharts.createChart(chartElement, {
            layout: {
                background: { color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
            },
        });

        candleSeries = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
        });
        console.log("Chart created successfully.");
    } catch (e) {
        console.error("CHART_INIT_ERROR:", e);
    }

    // Resize handler
    window.addEventListener('resize', () => {
        chart.applyOptions({
            width: chartElement.clientWidth,
            height: chartElement.clientHeight
        });
    });

    // --- State & Handlers ---
    let currentAsset = 'BTC/USDT';
    let lastPrice = 0;

    async function updateTicker() {
        if (!candleSeries) return;
        try {
            const normalizedAsset = currentAsset.replace('/', '_');
            const response = await fetch(`/api/tick/${normalizedAsset}`);
            const data = await response.json();
            
            // Update chart candle (real-time wicks/moves)
            candleSeries.update(data);

            // Update header ticker display
            const priceEl = document.getElementById('live-price-val');
            const assetEl = document.getElementById('live-price-asset');
            
            priceEl.innerText = data.close.toLocaleString(undefined, { minimumFractionDigits: 2 });
            assetEl.innerText = currentAsset;

            // Trigger animation based on price move
            if (lastPrice !== 0) {
                priceEl.classList.remove('animate-up', 'animate-down');
                void priceEl.offsetWidth; // Force reflow
                if (data.close > lastPrice) {
                    priceEl.classList.add('animate-up');
                } else if (data.close < lastPrice) {
                    priceEl.classList.add('animate-down');
                }
            }
            lastPrice = data.close;
        } catch (error) {
            console.error("Error fetching tick:", error);
        }
    }

    async function updateChart(asset) {
        if (!candleSeries) return;
        try {
            const normalizedAsset = asset.replace('/', '_');
            const response = await fetch(`/api/chart/${normalizedAsset}`);
            const data = await response.json();
            
            // Lightweight charts expects time in seconds
            candleSeries.setData(data);
            chart.timeScale().fitContent();
        } catch (error) {
            console.error("Error fetching chart data:", error);
        }
    }

    async function updateSentiment() {
        try {
            const response = await fetch('/api/sentiment');
            const data = await response.json();
            
            const valueEl = document.getElementById('sentiment-value');
            const scoreEl = document.getElementById('sentiment-score');
            const statusIcon = document.getElementById('sentiment-status');

            valueEl.innerText = data.status;
            scoreEl.innerText = `Score: ${data.score}`;
            
            // Update icon color class
            statusIcon.className = 'kpi-icon-wrapper';
            if (data.score > 0.6) statusIcon.classList.add('profit'); // Green
            else if (data.score < 0.4) statusIcon.classList.add('negative'); // Red
            else statusIcon.classList.add('neutral'); // Yellow
        } catch (error) {
            console.error("Error fetching sentiment:", error);
        }
    }

    async function updateSignals() {
        try {
            const response = await fetch('/api/signals');
            const data = await response.json();
            
            const container = document.getElementById('signals-container');
            container.innerHTML = ''; // Clear previous

            data.forEach(signal => {
                const item = document.createElement('div');
                item.className = 'signal-item';
                
                const sideClass = signal.action === 'BUY' ? 'buy-side' : 
                                 (signal.action === 'SELL' ? 'sell-side' : 'hold-side');

                item.innerHTML = `
                    <div class="signal-side ${sideClass}">${signal.action}</div>
                    <div class="signal-info">
                        <h4>${signal.asset}</h4>
                        <div class="signal-reason">${signal.reason}</div>
                    </div>
                    <div class="signal-meta">
                        <span class="confidence-val">${signal.confidence}%</span>
                        <span class="confidence-label">Confidence</span>
                    </div>
                `;
                container.appendChild(item);
            });
        } catch (error) {
            console.error("Error fetching signals:", error);
        }
    }

    // --- Event Listeners ---
    document.getElementById('asset-selector').addEventListener('change', (e) => {
        currentAsset = e.target.value;
        lastPrice = 0; // Reset ticker correlation
        updateChart(currentAsset);
    });

    // --- Initial Load ---
    console.log("Initializing Dashboard...");
    updateChart(currentAsset);
    updateSentiment();
    updateSignals();
    console.log("Initial load commands sent.");

    // --- Realtime Simulation Loops ---
    console.log("Starting Live Streaming...");
    updateTicker(); // Immediate first tick
    setInterval(updateTicker, 1000);    // Every 1s
    setInterval(updateSentiment, 10000); // Every 10s
    setInterval(updateSignals, 15000);   // Every 15s

    // Navigation mocking
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.nav-item.active').classList.remove('active');
            item.classList.add('active');
        });
    });
});
