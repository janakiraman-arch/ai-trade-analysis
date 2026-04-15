// =====================================================================
//  APEX AI – DASHBOARD JS
//  Dedicated script for /dashboard
// =====================================================================

/* ── Utility: smooth number count animation ─────────────────────── */
function animateNumber(el, from, to, decimals = 2, duration = 700) {
    const start = performance.now();
    const diff  = to - from;
    (function step(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
        const val = from + diff * eased;
        el.textContent = val.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
        if (p < 1) requestAnimationFrame(step);
    })(start);
}

/* ── Utility: brief glow flash on an element ────────────────────── */
function flashGlow(el, color = 'rgba(99,102,241,0.5)') {
    el.style.transition = 'box-shadow 0.12s ease';
    el.style.boxShadow  = `0 0 28px ${color}`;
    setTimeout(() => { el.style.boxShadow = ''; }, 500);
}

// =====================================================================
//  INIT ON DOM READY
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {

    /* ── View Router ────────────────────────────────────────────── */
    const views = {
        'nav-dashboard': document.getElementById('view-dashboard'),
        'nav-live': document.getElementById('view-live'),
        'nav-intelligence': document.getElementById('view-intelligence'),
        'nav-activity': document.getElementById('view-activity'),
        'nav-analytics': document.getElementById('view-analytics'),
        'nav-signals': document.getElementById('view-signals'),
        'nav-settings': document.getElementById('view-settings')
    };

    function switchView(targetNavId) {
        // Remove active class from all navs and views
        Object.keys(views).forEach(navId => {
            const navEl = document.getElementById(navId);
            const viewEl = views[navId];
            if (navEl) {
                navEl.classList.remove('active');
                // Remove pip if not active
                const pip = navEl.querySelector('.nav-pip');
                if (pip && activeNavId !== navId) pip.remove();
            }
            if (viewEl) viewEl.classList.remove('active');
        });

        // Add active class to target
        const activeNavEl = document.getElementById(targetNavId);
        const activeViewEl = views[targetNavId];
        
        if (activeNavEl) {
            activeNavEl.classList.add('active');
            // Ensure Pip is present
            if (!activeNavEl.querySelector('.nav-pip')) {
                 const pip = document.createElement('div');
                 pip.className = 'nav-pip';
                 activeNavEl.appendChild(pip);
            }
        }
        if (activeViewEl) {
            // Force reflow for CSS animation
            void activeViewEl.offsetWidth;
            activeViewEl.classList.add('active');
        }
    }

    let activeNavId = 'nav-dashboard';

    Object.keys(views).forEach(navId => {
        const navEl = document.getElementById(navId);
        if (navEl) {
            navEl.addEventListener('click', (e) => {
                e.preventDefault();
                if (activeNavId === navId) return;
                activeNavId = navId;
                switchView(navId);
            });
        }
    });

    /* ── State ──────────────────────────────────────────────────── */
    let currentAsset = 'BTC/USDT';
    let lastPrice    = 0;
    let chart, candleSeries;
    let lastSignalIds = new Set();
    let isVoiceEnabled = false;

    /* ─────────────────────────────────────────────────────────────
       CHART INIT
    ───────────────────────────────────────────────────────────── */
    const chartEl = document.getElementById('price-chart');

    try {
        chart = LightweightCharts.createChart(chartEl, {
            width: chartEl.clientWidth || 800,
            height: chartEl.clientHeight || 400,
            layout: {
                background: { color: 'transparent' },
                textColor:  '#64748b',
            },
            grid: {
                vertLines: { color: 'rgba(255,255,255,0.04)' },
                horzLines: { color: 'rgba(255,255,255,0.04)' },
            },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
            timeScale: {
                borderColor: 'rgba(255,255,255,0.08)',
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll:   { mouseWheel: true, pressedMouseMove: true },
            handleScale:    { mouseWheel: true, pinch: true },
        });

        candleSeries = chart.addCandlestickSeries({
            upColor:        '#10b981',
            downColor:      '#ef4444',
            borderUpColor:  '#10b981',
            borderDownColor:'#ef4444',
            wickUpColor:    '#10b981',
            wickDownColor:  '#ef4444',
        });

        // Subscribe to crosshair to update OHLC stats
        chart.subscribeCrosshairMove(param => {
            if (!param.time || !candleSeries) return;
            const data = param.seriesData.get(candleSeries);
            if (data) updateOHLC(data);
        });

    } catch (err) {
        console.error('CHART INIT ERROR:', err);
    }

    // Resize observer for the chart
    const resizeObserver = new ResizeObserver(() => {
        if (chart) chart.applyOptions({
            width:  chartEl.clientWidth,
            height: chartEl.clientHeight,
        });
    });
    resizeObserver.observe(chartEl);

    /* ─────────────────────────────────────────────────────────────
       UPDATE FUNCTIONS
    ───────────────────────────────────────────────────────────── */

    // OHLC display under chart
    function updateOHLC(data) {
        const fmt = v => v != null ? v.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '--';
        document.getElementById('cs-open').textContent  = fmt(data.open);
        document.getElementById('cs-high').textContent  = fmt(data.high);
        document.getElementById('cs-low').textContent   = fmt(data.low);
        document.getElementById('cs-close').textContent = fmt(data.close);
    }

    // Live price ticker in topbar
    async function updateTicker() {
        if (!candleSeries) return;
        try {
            const normalized = currentAsset.replace('/', '_');
            const res  = await fetch(`/api/tick/${normalized}`);
            const data = await res.json();

            candleSeries.update(data);

            const priceEl  = document.getElementById('ticker-price');
            const assetEl  = document.getElementById('ticker-asset');
            const changeEl = document.getElementById('ticker-change');

            assetEl.textContent = currentAsset;

            // Animate the counter
            const prev = lastPrice || data.close;
            animateNumber(priceEl, prev, data.close, 2, 700);

            // Color flash
            if (lastPrice !== 0) {
                priceEl.classList.remove('price-up', 'price-down');
                void priceEl.offsetWidth;
                const wrapper = document.getElementById('live-price-wrapper');
                if (data.close > lastPrice) {
                    priceEl.classList.add('price-up');
                    changeEl.style.color = '#10b981';
                    changeEl.textContent = `▲ ${((data.close - lastPrice) / lastPrice * 100).toFixed(3)}%`;
                    flashGlow(wrapper, 'rgba(16,185,129,0.3)');
                } else if (data.close < lastPrice) {
                    priceEl.classList.add('price-down');
                    changeEl.style.color = '#ef4444';
                    changeEl.textContent = `▼ ${((lastPrice - data.close) / lastPrice * 100).toFixed(3)}%`;
                    flashGlow(wrapper, 'rgba(239,68,68,0.3)');
                }
            }
            lastPrice = data.close;
            updateOHLC(data);

        } catch (err) { console.error('Ticker error:', err); }
    }

    // Load chart history
    async function loadChart(asset) {
        if (!candleSeries) return;
        try {
            // Fade chart out briefly
            chartEl.style.transition = 'opacity 0.3s ease';
            chartEl.style.opacity = '0.35';

            const normalized = asset.replace('/', '_');
            const res  = await fetch(`/api/chart/${normalized}`);
            const data = await res.json();

            candleSeries.setData(data);
            chart.timeScale().fitContent();

            chartEl.style.opacity = '1';
        } catch (err) { console.error('Chart error:', err); }
    }

    // Sentiment
    async function updateSentiment() {
        try {
            const res  = await fetch('/api/sentiment');
            const data = await res.json();

            const valEl    = document.getElementById('sentiment-value');
            const badgeEl  = document.getElementById('sentiment-badge');
            const iconBox  = document.getElementById('sentiment-icon-box');

            const prev = valEl.textContent;
            valEl.textContent   = data.status;
            badgeEl.textContent = `Score: ${data.score}`;

            if (prev !== data.status) {
                valEl.style.animation = 'none';
                void valEl.offsetWidth;
                valEl.style.animation = 'countUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
                // Find closest kpi-card and flash it
                const card = iconBox.closest('.kpi-card');
                if (card) flashGlow(card, 'rgba(245,158,11,0.28)');
            }

            // Update badge color
            badgeEl.className = 'kpi-badge';
            iconBox.className = 'kpi-icon-box ai-box';
            if (data.score > 0.6) {
                badgeEl.classList.add('up');
            } else if (data.score < 0.4) {
                badgeEl.classList.add('down');
                iconBox.className = 'kpi-icon-box pos-box';
            } else {
                badgeEl.classList.add('neutral');
            }

        } catch (err) { console.error('Sentiment error:', err); }
    }

    // AI Signals
    async function updateSignals() {
        try {
            const res  = await fetch('/api/signals');
            const data = await res.json();
            const container = document.getElementById('signals-container');

            // Fade existing out
            Array.from(container.children).forEach(c => {
                c.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
                c.style.opacity    = '0';
                c.style.transform  = 'translateX(-12px)';
            });

            setTimeout(() => {
                container.innerHTML = '';
                let newSignals = [];

                data.forEach((sig, i) => {
                    const sigId = `${sig.asset}-${sig.action}`;
                    if (!lastSignalIds.has(sigId)) {
                        newSignals.push(sig);
                    }

                    const confColor =
                        sig.confidence >= 75 ? '#10b981' :
                        sig.confidence >= 50 ? '#f59e0b' : '#ef4444';

                    const chip = sig.action === 'BUY'  ? 'chip-buy'
                               : sig.action === 'SELL' ? 'chip-sell' : 'chip-hold';

                    const el = document.createElement('div');
                    el.className = 'signal-item';
                    el.style.animationDelay = `${i * 0.065}s`;
                    el.innerHTML = `
                        <div class="sig-chip ${chip}">${sig.action}</div>
                        <div class="sig-info">
                            <span class="sig-name">${sig.asset}</span>
                            <span class="sig-reason">${sig.reason}</span>
                        </div>
                        <div class="sig-meta">
                            <span class="sig-conf" style="color:${confColor}">${sig.confidence}%</span>
                            <span class="sig-label">Confidence</span>
                        </div>
                    `;
                    container.appendChild(el);
                });

                // Update signal IDs for next comparison
                lastSignalIds = new Set(data.map(sig => `${sig.asset}-${sig.action}`));

                // Trigger voice for the most important new signal (if any)
                if (newSignals.length > 0 && isVoiceEnabled) {
                    const topSig = newSignals[0];
                    announceSignal(topSig);
                }

            }, 260);

        } catch (err) { console.error('Signals error:', err); }
    }

    /* ── Voice Engine ───────────────────────────────────────────── */
    function announceSignal(sig) {
        const assistant = document.getElementById('voice-assistant');
        const text = `AI Alert: ${sig.action} signal for ${sig.asset.replace('/', ' ')} with ${sig.confidence} percent confidence. ${sig.reason}`;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        
        // Find a professional voice if possible
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Premium'));
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => {
            assistant.classList.add('is-speaking');
            assistant.classList.remove('sig-buy', 'sig-sell', 'sig-hold', 'sig-neutral');
            const actionClass = `sig-${sig.action.toLowerCase()}`;
            assistant.classList.add(actionClass || 'sig-neutral');
            const stopBtn = document.getElementById('voice-stop');
            if (stopBtn) stopBtn.style.display = 'flex';
        };

        utterance.onend = () => {
            assistant.classList.remove('is-speaking');
            const stopBtn = document.getElementById('voice-stop');
            if (stopBtn) stopBtn.style.display = 'none';
        };

        window.speechSynthesis.speak(utterance);
    }

    // Initialize voices (some browsers need this)
    window.speechSynthesis.getVoices();


    /* ─────────────────────────────────────────────────────────────
       EVENT LISTENERS
    ───────────────────────────────────────────────────────────── */

    // Asset selector
    document.getElementById('asset-selector').addEventListener('change', e => {
        currentAsset = e.target.value;
        lastPrice    = 0;
        loadChart(currentAsset);
    });

    // Timeframe pills (visual only for now)
    document.querySelectorAll('.tf-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tf-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Re-load chart with same asset (visual refresh)
            loadChart(currentAsset);
        });
    });

    // Nav link active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            if (link.getAttribute('href') === '#') e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Voice Stop Navigation
    const voiceAssistantEl = document.getElementById('voice-assistant');
    const voiceStopBtn = document.getElementById('voice-stop');
    if (voiceStopBtn) {
        voiceStopBtn.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            if (voiceAssistantEl) voiceAssistantEl.classList.remove('is-speaking', 'sig-buy', 'sig-sell', 'sig-hold', 'sig-neutral');
            voiceStopBtn.style.display = 'none';
        });
    }

    // Voice Toggle
    const voiceBtn = document.getElementById('voice-toggle');
    voiceBtn.addEventListener('click', () => {
        isVoiceEnabled = !isVoiceEnabled;
        voiceBtn.classList.toggle('active');
        
        if (isVoiceEnabled) {
            voiceBtn.innerHTML = '<i data-lucide="mic"></i>';
            voiceBtn.title = "Disable AI Voice Assistant";
            
            // Test voice
            const testUtterance = new SpeechSynthesisUtterance("AI Voice Control Active");
            testUtterance.rate = 1.05;
            
            testUtterance.onstart = () => {
                if (voiceAssistantEl) voiceAssistantEl.classList.add('is-speaking', 'sig-neutral');
                if (voiceStopBtn) voiceStopBtn.style.display = 'flex';
            };
            
            testUtterance.onend = () => {
                if (voiceAssistantEl) voiceAssistantEl.classList.remove('is-speaking', 'sig-neutral');
                if (voiceStopBtn) voiceStopBtn.style.display = 'none';
            };
            window.speechSynthesis.speak(testUtterance);
        } else {
            voiceBtn.innerHTML = '<i data-lucide="mic-off"></i>';
            voiceBtn.title = "Enable AI Voice Assistant";
            window.speechSynthesis.cancel();
            if (voiceStopBtn) voiceStopBtn.style.display = 'none';
            if (voiceAssistantEl) voiceAssistantEl.classList.remove('is-speaking', 'sig-neutral', 'sig-buy', 'sig-sell', 'sig-hold');
        }
        lucide.createIcons();
    });


    /* ─────────────────────────────────────────────────────────────
       INITIAL LOAD
    ───────────────────────────────────────────────────────────── */
    loadChart(currentAsset);
    updateSentiment();
    updateSignals();
    updateTicker();

    // Polling intervals
    setInterval(updateTicker,   1000);   // 1s  — live price tick
    setInterval(updateSentiment, 10000); // 10s — AI sentiment
    setInterval(updateSignals,   15000); // 15s — signals refresh

    console.log('%c APEX AI Dashboard Loaded ', 'background:#6366f1;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold;');
});
