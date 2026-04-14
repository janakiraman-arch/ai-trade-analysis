console.log("APEX JS LOADING...");

// ── Utility: animate a number counting up/down smoothly ──────────────────
function animateNumber(el, from, to, decimals = 2, duration = 600) {
    const start = performance.now();
    const diff = to - from;
    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        // ease-out-cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = from + diff * eased;
        el.textContent = value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ── Utility: flash a card border/glow briefly ─────────────────────────────
function flashCard(el, color = 'rgba(99,102,241,0.5)') {
    el.style.transition = 'box-shadow 0.15s ease';
    el.style.boxShadow = `0 0 30px ${color}`;
    setTimeout(() => { el.style.boxShadow = ''; }, 500);
}

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
            
            assetEl.innerText = currentAsset;

            // Animate number rolling up/down
            const prevNum = lastPrice || data.close;
            animateNumber(priceEl, prevNum, data.close, 2, 700);

            // Trigger color animation based on price move
            if (lastPrice !== 0) {
                priceEl.classList.remove('animate-up', 'animate-down');
                void priceEl.offsetWidth; // Force reflow
                if (data.close > lastPrice) {
                    priceEl.classList.add('animate-up');
                    flashCard(
                        document.getElementById('live-price-wrapper'),
                        'rgba(16,185,129,0.35)'
                    );
                } else if (data.close < lastPrice) {
                    priceEl.classList.add('animate-down');
                    flashCard(
                        document.getElementById('live-price-wrapper'),
                        'rgba(239,68,68,0.35)'
                    );
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
            const sentimentCard = statusIcon.closest('.kpi-card');

            const prevText = valueEl.innerText;
            valueEl.innerText = data.status;
            scoreEl.innerText = `Score: ${data.score}`;
            
            // Animate card on sentiment change
            if (prevText !== data.status) {
                valueEl.style.animation = 'none';
                void valueEl.offsetWidth;
                valueEl.style.animation = 'countUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
                if (sentimentCard) flashCard(sentimentCard, 'rgba(245,158,11,0.3)');
            }

            // Update icon color class
            statusIcon.className = 'kpi-icon-wrapper';
            if (data.score > 0.6)      statusIcon.classList.add('profit');   // Green
            else if (data.score < 0.4) statusIcon.classList.add('negative'); // Red
            else                       statusIcon.classList.add('neutral');   // Yellow
        } catch (error) {
            console.error("Error fetching sentiment:", error);
        }
    }

    async function updateSignals() {
        try {
            const response = await fetch('/api/signals');
            const data = await response.json();
            
            const container = document.getElementById('signals-container');

            // Fade out existing items
            Array.from(container.children).forEach(child => {
                child.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                child.style.opacity = '0';
                child.style.transform = 'translateX(-10px)';
            });

            setTimeout(() => {
                container.innerHTML = ''; // Clear previous

                data.forEach((signal, i) => {
                    const item = document.createElement('div');
                    item.className = 'signal-item';
                    item.style.animationDelay = `${i * 0.07}s`;
                    
                    const sideClass = signal.action === 'BUY' ? 'buy-side' : 
                                     (signal.action === 'SELL' ? 'sell-side' : 'hold-side');
                    const confColor = signal.confidence >= 75 ? 'var(--success)'
                                   : signal.confidence >= 50 ? 'var(--warning)'
                                   : 'var(--danger)';

                    item.innerHTML = `
                        <div class="signal-side ${sideClass}">${signal.action}</div>
                        <div class="signal-info">
                            <h4>${signal.asset}</h4>
                            <div class="signal-reason">${signal.reason}</div>
                        </div>
                        <div class="signal-meta">
                            <span class="confidence-val" style="color:${confColor}">${signal.confidence}%</span>
                            <span class="confidence-label">Confidence</span>
                        </div>
                    `;
                    container.appendChild(item);
                });
            }, 280);

        } catch (error) {
            console.error("Error fetching signals:", error);
        }
    }

    // --- Event Listeners ---
    document.getElementById('asset-selector').addEventListener('change', (e) => {
        currentAsset = e.target.value;
        lastPrice = 0; // Reset ticker correlation
        // brief shimmer on chart area when switching
        const chartEl = document.getElementById('price-chart');
        chartEl.style.opacity = '0.4';
        chartEl.style.transition = 'opacity 0.3s ease';
        setTimeout(() => { chartEl.style.opacity = '1'; }, 350);
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
