// ==========================================
// 1. STATE & INITIALIZATION
// ==========================================
let trades = JSON.parse(localStorage.getItem('gold_trades')) || [];
let accountType = 'std'; // 'std' atau 'cent'
let currentCalendarDate = new Date();
let currentSymbol = "OANDA:XAUUSD";

let equityChart, dayChart, sessionChart, winLossChart;

document.addEventListener('DOMContentLoaded', () => {
    initTradingViewWidget("OANDA:XAUUSD");
    initCharts();
    setupEventListeners();
    updateCalculator();
    renderJournal();
    renderCalendar();
    updateStats();
    startClockAndSessions();
});

// ==========================================
// 2. TRADINGVIEW WIDGET & SYMBOL SWITCHER
// ==========================================
function initTradingViewWidget(symbol) {
    currentSymbol = symbol;
    const container = document.getElementById('tradingview_gold');
    if (!container) return;
    container.innerHTML = ''; // Reset container

    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "autosize": true,
            "symbol": symbol,
            "interval": "15",
            "timezone": "Asia/Jakarta",
            "theme": "light",
            "style": "1",
            "locale": "id",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "hide_top_toolbar": false,
            "save_image": false,
            "container_id": "tradingview_gold"
        });
    }
}

// ==========================================
// 3. EVENT LISTENERS & CLOCK / SESSION TRACKER
// ==========================================
function setupEventListeners() {
    // Switch Account Type
    const btnStd = document.getElementById('btn-acc-std');
    const btnCent = document.getElementById('btn-acc-cent');
    btnStd.addEventListener('click', () => setAccountType('std'));
    btnCent.addEventListener('click', () => setAccountType('cent'));

    // Switch Symbol Tabs
    document.getElementById('tab-xauusd').addEventListener('click', (e) => switchChartTab(e.target, 'OANDA:XAUUSD'));
    document.getElementById('tab-dxy').addEventListener('click', (e) => switchChartTab(e.target, 'CAPITALCOM:DXY'));
    document.getElementById('tab-us10y').addEventListener('click', (e) => switchChartTab(e.target, 'TVC:US10Y'));

    // Calculator Live Input
    ['calc-balance', 'calc-risk', 'calc-sl-pips'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateCalculator);
    });

    // Form Trade Submit
    document.getElementById('trade-form').addEventListener('submit', handleTradeSubmit);

    // Export / Import / Backup
    document.getElementById('btn-export-csv').addEventListener('click', exportToCSV);
    document.getElementById('btn-export-json').addEventListener('click', exportToJSON);
    document.getElementById('file-import').addEventListener('change', importFromJSON);

    // Calendar Navigation
    document.getElementById('btn-prev-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('btn-next-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
}

function switchChartTab(activeBtn, symbol) {
    ['tab-xauusd', 'tab-dxy', 'tab-us10y'].forEach(id => {
        const btn = document.getElementById(id);
        btn.className = "px-3 py-1 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition";
    });
    activeBtn.className = "px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 text-white shadow-sm transition";
    initTradingViewWidget(symbol);
}

function startClockAndSessions() {
    function updateTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        const clockStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('clock-wib').innerText = clockStr;

        // Active Session Checker (WIB UTC+7)
        const isSydney = hours >= 5 && hours < 14;
        const isTokyo = hours >= 7 && hours < 16;
        const isLondon = hours >= 15 && hours < 23;
        const isNY = hours >= 20 || hours < 4;

        updateSessionBadge('session-sydney', isSydney);
        updateSessionBadge('session-tokyo', isTokyo);
        updateSessionBadge('session-london', isLondon);
        updateSessionBadge('session-newyork', isNY);
    }

    updateTime();
    setInterval(updateTime, 1000);
}

function updateSessionBadge(elementId, isActive) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const dot = el.querySelector('.status-dot');
    if (isActive) {
        el.className = "session-badge flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm";
        if (dot) dot.className = "status-dot pulse-dot";
    } else {
        el.className = "session-badge flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold bg-slate-50 text-slate-400 border-slate-200 opacity-70";
        if (dot) dot.className = "status-dot w-2 h-2 rounded-full bg-slate-300";
    }
}

// ==========================================
// 4. RISK & LOT CALCULATOR
// ==========================================
function setAccountType(type) {
    accountType = type;
    const btnStd = document.getElementById('btn-acc-std');
    const btnCent = document.getElementById('btn-acc-cent');
    const lblBalance = document.getElementById('lbl-balance');

    if (type === 'std') {
        btnStd.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-white shadow-sm transition";
        btnCent.className = "px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
        lblBalance.innerText = "Balance / Modal ($)";
    } else {
        btnCent.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-white shadow-sm transition";
        btnStd.className = "px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
        lblBalance.innerText = "Balance / Modal (US Cents)";
    }
    updateCalculator();
}

function updateCalculator() {
    const balance = parseFloat(document.getElementById('calc-balance').value) || 0;
    const riskPercent = parseFloat(document.getElementById('calc-risk').value) || 0;
    const slPips = parseFloat(document.getElementById('calc-sl-pips').value) || 1;

    const riskAmount = balance * (riskPercent / 100);
    const lotSize = riskAmount / (slPips * 10);

    const symbol = accountType === 'cent' ? 'USC' : '$';
    document.getElementById('res-risk-usd').innerText = `${symbol}${riskAmount.toFixed(2)}`;
    document.getElementById('res-lot').innerText = `${lotSize.toFixed(2)} Lot`;
}

// ==========================================
// 5. JURNAL & DATA MANAGEMENT
// ==========================================
function handleTradeSubmit(e) {
    e.preventDefault();

    const entry = parseFloat(document.getElementById('trade-entry').value) || 0;
    const exit = parseFloat(document.getElementById('trade-exit').value) || 0;
    const pnl = parseFloat(document.getElementById('trade-pnl').value) || 0;
    const type = document.getElementById('trade-type').value;

    const riskAmount = (parseFloat(document.getElementById('calc-balance').value) || 1000) * 
                       ((parseFloat(document.getElementById('calc-risk').value) || 1) / 100);
    const rMultiple = riskAmount > 0 ? (pnl / riskAmount).toFixed(1) : "0.0";

    const newTrade = {
        id: Date.now(),
        date: document.getElementById('trade-date').value,
        session: document.getElementById('trade-session').value,
        type: type,
        setup: document.getElementById('trade-setup').value,
        entry: entry,
        exit: exit,
        lot: parseFloat(document.getElementById('trade-lot').value) || 0.01,
        pnl: pnl,
        emotion: document.getElementById('trade-emotion').value,
        news: document.getElementById('trade-news').value,
        rMultiple: rMultiple
    };

    trades.unshift(newTrade);
    saveTrades();
    renderJournal();
    updateStats();
    renderCalendar();
    
    document.getElementById('trade-form').reset();
}

function deleteTrade(id) {
    if (confirm("Apakah Anda yakin ingin menghapus catatan trade ini?")) {
        trades = trades.filter(t => t.id !== id);
        saveTrades();
        renderJournal();
        updateStats();
        renderCalendar();
    }
}

function saveTrades() {
    localStorage.setItem('gold_trades', JSON.stringify(trades));
}

function renderJournal() {
    const tbody = document.getElementById('journal-table-body');
    tbody.innerHTML = '';

    if (trades.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-slate-400 italic">Belum ada catatan jurnal trading. Isi form di atas untuk menambah.</td></tr>`;
        return;
    }

    trades.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
        
        const pnlClass = t.pnl >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold";
        const typeClass = t.type === 'BUY' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200";

        tr.innerHTML = `
            <td class="p-3 font-medium text-slate-800">${t.date}</td>
            <td class="p-3 font-semibold text-slate-600">${t.session}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold border ${typeClass}">${t.type}</span></td>
            <td class="p-3 text-slate-700">${t.setup}</td>
            <td class="p-3 font-mono text-[11px] text-slate-500">${t.entry.toFixed(2)} / ${t.exit.toFixed(2)}</td>
            <td class="p-3 font-medium">${t.lot.toFixed(2)}</td>
            <td class="p-3 ${pnlClass}">${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}</td>
            <td class="p-3 font-mono text-slate-600 font-semibold">${t.rMultiple || "0"}R</td>
            <td class="p-3 text-center">
                <button onclick="deleteTrade(${t.id})" class="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded transition">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 6. STATS & ANALYTICS
// ==========================================
function updateStats() {
    const totalTrades = trades.length;
    if (totalTrades === 0) {
        document.getElementById('winrate-val').innerText = '0%';
        document.getElementById('total-pnl-val').innerText = '$0.00';
        document.getElementById('total-pnl-val').className = "text-lg font-bold text-slate-800";
        document.getElementById('profit-factor-val').innerText = '0.00';
        document.getElementById('total-trades-val').innerText = '0';
        updateCharts([], [], [], []);
        return;
    }

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);

    const winrate = ((wins.length / totalTrades) * 100).toFixed(1);
    const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);

    const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit.toFixed(2) : (grossProfit / grossLoss).toFixed(2);

    document.getElementById('winrate-val').innerText = `${winrate}%`;
    document.getElementById('total-pnl-val').innerText = `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`;
    document.getElementById('total-pnl-val').className = `text-lg font-bold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
    document.getElementById('profit-factor-val').innerText = profitFactor;
    document.getElementById('total-trades-val').innerText = totalTrades;

    updateCharts(wins, losses, totalTrades, totalPnL);
}

// ==========================================
// 7. CHART.JS INTEGRATION
// ==========================================
function initCharts() {
    const opts = { responsive: true, maintainAspectRatio: false };

    equityChart = new Chart(document.getElementById('equityChart'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Equity ($)', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.2 }] },
        options: opts
    });

    dayChart = new Chart(document.getElementById('dayChart'), {
        type: 'bar',
        data: { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'], datasets: [{ label: 'Win Rate (%)', data: [0,0,0,0,0], backgroundColor: '#3b82f6' }] },
        options: opts
    });

    sessionChart = new Chart(document.getElementById('sessionChart'), {
        type: 'bar',
        data: { labels: ['Asia', 'London', 'New York'], datasets: [{ label: 'P/L ($)', data: [0,0,0], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] },
        options: opts
    });

    winLossChart = new Chart(document.getElementById('winLossChart'), {
        type: 'doughnut',
        data: { labels: ['Win', 'Loss'], datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#ef4444'] }] },
        options: opts
    });
}

function updateCharts(wins, losses, totalTrades, totalPnL) {
    const sortedTrades = [...trades].reverse();
    let currentEquity = parseFloat(document.getElementById('calc-balance').value) || 1000;
    const equityData = [currentEquity];
    const equityLabels = ['Start'];

    sortedTrades.forEach((t, i) => {
        currentEquity += t.pnl;
        equityData.push(currentEquity);
        equityLabels.push(`T${i + 1}`);
    });

    equityChart.data.labels = equityLabels;
    equityChart.data.datasets[0].data = equityData;
    equityChart.update();

    const days = [1, 2, 3, 4, 5];
    const dayWinRates = days.map(d => {
        const dayTrades = trades.filter(t => new Date(t.date).getDay() === d);
        if (dayTrades.length === 0) return 0;
        const dayWins = dayTrades.filter(t => t.pnl > 0).length;
        return Math.round((dayWins / dayTrades.length) * 100);
    });

    dayChart.data.datasets[0].data = dayWinRates;
    dayChart.update();

    const sessions = ['Asia', 'London', 'New York'];
    const sessionPnL = sessions.map(s => {
        return trades.filter(t => t.session === s).reduce((acc, t) => acc + t.pnl, 0);
    });

    sessionChart.data.datasets[0].data = sessionPnL;
    sessionChart.update();

    winLossChart.data.datasets[0].data = [wins.length, losses.length];
    winLossChart.update();
}

// ==========================================
// 8. KALENDER PERFORMA BULANAN
// ==========================================
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('calendar-month-label').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = "h-[52px] bg-slate-50/50 rounded-lg border border-slate-100/50";
        grid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTrades = trades.filter(t => t.date === dateStr);
        const dayPnL = dayTrades.reduce((acc, t) => acc + t.pnl, 0);

        const dayEl = document.createElement('div');
        let bgClass = "bg-slate-50 text-slate-600 border-slate-200/80";
        let pnlText = "";
        let hasDataClass = "";

        if (dayTrades.length > 0) {
            hasDataClass = "has-data cursor-pointer";
            if (dayPnL > 0) {
                bgClass = "bg-emerald-100/80 text-emerald-800 border-emerald-300 font-bold";
                pnlText = `+$${dayPnL.toFixed(0)}`;
            } else if (dayPnL < 0) {
                bgClass = "bg-rose-100/80 text-rose-800 border-rose-300 font-bold";
                pnlText = `-$${Math.abs(dayPnL).toFixed(0)}`;
            } else {
                bgClass = "bg-slate-200 text-slate-700 border-slate-300 font-bold";
                pnlText = "$0";
            }
        }

        dayEl.className = `cal-day ${hasDataClass} ${bgClass}`;
        dayEl.innerHTML = `
            <span class="font-bold text-[10px]">${day}</span>
            <span class="font-bold text-[9px] text-center block truncate">${pnlText}</span>
        `;
        grid.appendChild(dayEl);
    }
}

// ==========================================
// 9. EXPORT & IMPORT DATA
// ==========================================
function exportToCSV() {
    if (trades.length === 0) return alert('Belum ada data jurnal.');
    let csv = 'Tanggal,Sesi,Tipe,Setup,Entry,Exit,Lot,PnL,Emosi,News,RMultiple\n';
    trades.forEach(t => {
        csv += `"${t.date}","${t.session}","${t.type}","${t.setup}",${t.entry},${t.exit},${t.lot},${t.pnl},"${t.emotion || ''}","${t.news || ''}","${t.rMultiple || '0'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gold_trading_journal_${Date.now()}.csv`;
    a.click();
}

function exportToJSON() {
    if (trades.length === 0) return alert('Belum ada data jurnal.');
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gold_journal_backup_${Date.now()}.json`;
    a.click();
}

function importFromJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                trades = imported;
                saveTrades();
                renderJournal();
                updateStats();
                renderCalendar();
                alert('Data jurnal berhasil di-import!');
            }
        } catch (err) {
            alert('Format file JSON tidak valid.');
        }
    };
    reader.readAsText(file);
}
