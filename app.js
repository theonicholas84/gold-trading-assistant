// Initialize TradingView Widget
new TradingView.widget({
    "width": "100%",
    "height": "100%",
    "symbol": "OANDA:XAUUSD",
    "interval": "60",
    "timezone": "Asia/Jakarta",
    "theme": "dark",
    "style": "1",
    "locale": "id",
    "toolbar_bg": "#0f172a",
    "enable_publishing": false,
    "allow_symbol_change": true,
    "container_id": "tradingview_gold"
});

// State & Storage
let trades = JSON.parse(localStorage.getItem('gold_trades_v5')) || [];
let isCentAccount = false;
let currentCalDate = new Date();

// Charts
let equityChart = null;
let dayChart = null;
let sessionChart = null;
let winLossChart = null;

// Tab Navigation Logic
const tabBtns = {
    dashboard: document.getElementById('tab-btn-dashboard'),
    analytics: document.getElementById('tab-btn-analytics'),
    terminal: document.getElementById('tab-btn-terminal')
};

const tabContents = {
    dashboard: document.getElementById('tab-content-dashboard'),
    analytics: document.getElementById('tab-content-analytics'),
    terminal: document.getElementById('tab-content-terminal')
};

function switchTab(activeTabKey) {
    Object.keys(tabBtns).forEach(key => {
        if (key === activeTabKey) {
            tabBtns[key].classList.add('active-tab');
            tabBtns[key].classList.remove('text-slate-400');
            tabContents[key].classList.remove('hidden');
        } else {
            tabBtns[key].classList.remove('active-tab');
            tabBtns[key].classList.add('text-slate-400');
            tabContents[key].classList.add('hidden');
        }
    });

    logConsole(`SWITCHED: Navigated to [${activeTabKey.toUpperCase()}] Menu.`, 'INFO');
}

Object.keys(tabBtns).forEach(key => {
    tabBtns[key].addEventListener('click', () => switchTab(key));
});

// DOM Risk Calculator
const calcBalance = document.getElementById('calc-balance');
const calcRisk = document.getElementById('calc-risk');
const calcSlPips = document.getElementById('calc-sl-pips');
const resRiskUsd = document.getElementById('res-risk-usd');
const resLot = document.getElementById('res-lot');
const btnAccStd = document.getElementById('btn-acc-std');
const btnAccCent = document.getElementById('btn-acc-cent');
const lblBalance = document.getElementById('lbl-balance');

// Toggle Standard / Cent
btnAccStd.addEventListener('click', () => {
    isCentAccount = false;
    btnAccStd.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-slate-950 shadow-sm transition";
    btnAccCent.className = "px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-400 hover:text-slate-200 transition";
    lblBalance.textContent = "Balance / Modal ($)";
    calculateRisk();
});

btnAccCent.addEventListener('click', () => {
    isCentAccount = true;
    btnAccCent.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-slate-950 shadow-sm transition";
    btnAccStd.className = "px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-400 hover:text-slate-200 transition";
    lblBalance.textContent = "Balance / Modal (Cent)";
    calculateRisk();
});

function calculateRisk() {
    const balance = parseFloat(calcBalance.value) || 0;
    const riskPercent = parseFloat(calcRisk.value) || 0;
    const slPips = parseFloat(calcSlPips.value) || 0;

    const riskAmount = balance * (riskPercent / 100);
    let lotSize = 0;
    
    if (slPips > 0) {
        const multiplier = isCentAccount ? 0.1 : 10;
        lotSize = riskAmount / (slPips * multiplier);
    }

    const unitSymbol = isCentAccount ? 'Cent ' : '$';
    resRiskUsd.textContent = `${unitSymbol}${riskAmount.toFixed(2)}`;
    resLot.textContent = `${lotSize.toFixed(2)} Lot`;
}

[calcBalance, calcRisk, calcSlPips].forEach(input => {
    input.addEventListener('input', calculateRisk);
});
calculateRisk();

// Live Terminal Console Engine
const consoleStream = document.getElementById('console-stream');
const consoleInput = document.getElementById('console-input');

function logConsole(message, type = 'SYS') {
    if (!consoleStream) return;
    
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    let badgeColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (type === 'WARN') badgeColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    if (type === 'ERR') badgeColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (type === 'TRADE') badgeColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';

    const logRow = document.createElement('div');
    logRow.className = "flex items-start gap-2 animate-fade-in";
    logRow.innerHTML = `
        <span class="text-slate-500 font-mono text-[11px]">[${timeStr}]</span>
        <span class="px-1.5 py-0.2 text-[10px] border rounded font-mono font-bold ${badgeColor}">${type}</span>
        <span class="text-slate-200 font-mono">${message}</span>
    `;

    consoleStream.appendChild(logRow);
    consoleStream.scrollTop = consoleStream.scrollHeight;
}

document.getElementById('btn-clear-console')?.addEventListener('click', () => {
    consoleStream.innerHTML = '';
    logConsole('Console logs cleared.', 'SYS');
});

// Console Input Command Line (/help, /clear, /risk)
consoleInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = consoleInput.value.trim();
        if (!cmd) return;

        logConsole(`> ${cmd}`, 'CMD');
        consoleInput.value = '';

        if (cmd === '/clear') {
            consoleStream.innerHTML = '';
        } else if (cmd === '/help') {
            logConsole('Available Commands: /help, /clear, /risk [bal] [risk%] [sl], /stats', 'SYS');
        } else if (cmd.startsWith('/risk')) {
            const parts = cmd.split(' ');
            if (parts.length === 4) {
                calcBalance.value = parts[1];
                calcRisk.value = parts[2];
                calcSlPips.value = parts[3];
                calculateRisk();
                logConsole(`Calculator updated: Lot ${resLot.textContent}`, 'CALC');
            } else {
                logConsole('Usage: /risk [balance] [risk%] [slPips] (e.g. /risk 1000 1 30)', 'ERR');
            }
        } else if (cmd === '/stats') {
            logConsole(`Trades: ${trades.length} | Winrate: ${document.getElementById('winrate-val').textContent} | Total PnL: ${document.getElementById('total-pnl-val').textContent}`, 'SYS');
        } else {
            logConsole(`Unknown command: "${cmd}". Type /help for assistance.`, 'WARN');
        }
    }
});

// Initialize Analytics & Charts
function initCharts() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = '#334155';

    // 1. Equity Line
    const ctxEquity = document.getElementById('equityChart').getContext('2d');
    equityChart = new Chart(ctxEquity, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Equity ($)', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { font: { size: 10 } } } } }
    });

    // 2. Day Chart
    const ctxDay = document.getElementById('dayChart').getContext('2d');
    dayChart = new Chart(ctxDay, {
        type: 'bar',
        data: { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'], datasets: [{ label: 'Win Rate %', data: [0,0,0,0,0], backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { callback: v => v+'%' } } } }
    });

    // 3. Session Chart
    const ctxSession = document.getElementById('sessionChart').getContext('2d');
    sessionChart = new Chart(ctxSession, {
        type: 'bar',
        data: { labels: ['Asia', 'London', 'New York'], datasets: [{ label: 'P/L ($)', data: [0,0,0], backgroundColor: ['#38bdf8', '#34d399', '#fbbf24'], borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 4. Win/Loss Donut
    const ctxWinLoss = document.getElementById('winLossChart').getContext('2d');
    winLossChart = new Chart(ctxWinLoss, {
        type: 'doughnut',
        data: { labels: ['Win', 'Loss'], datasets: [{ data: [0, 0], backgroundColor: ['#34d399', '#f87171'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
    });
}

function updateAnalytics() {
    if (!equityChart) return;

    // Equity Curve
    const sortedTrades = [...trades].reverse();
    let currentEquity = parseFloat(calcBalance.value) || 1000;
    const eqPoints = [currentEquity];
    const eqLabels = ['Start'];

    sortedTrades.forEach((t, i) => {
        currentEquity += parseFloat(t.pnl);
        eqPoints.push(currentEquity);
        eqLabels.push(`T${i + 1}`);
    });

    equityChart.data.labels = eqLabels;
    equityChart.data.datasets[0].data = eqPoints;
    equityChart.update();

    // Day & Session
    const dayStats = { 1: { win: 0, total: 0 }, 2: { win: 0, total: 0 }, 3: { win: 0, total: 0 }, 4: { win: 0, total: 0 }, 5: { win: 0, total: 0 } };
    const sessionPnl = { 'Asia': 0, 'London': 0, 'New York': 0 };
    let winCount = 0;
    let lossCount = 0;

    trades.forEach(t => {
        const pnl = parseFloat(t.pnl);
        const d = new Date(t.date).getDay();
        
        if (d >= 1 && d <= 5) {
            dayStats[d].total++;
            if (pnl > 0) dayStats[d].win++;
        }

        if (t.session && sessionPnl.hasOwnProperty(t.session)) {
            sessionPnl[t.session] += pnl;
        }

        if (pnl > 0) winCount++;
        else if (pnl < 0) lossCount++;
    });

    dayChart.data.datasets[0].data = [1,2,3,4,5].map(d => dayStats[d].total > 0 ? ((dayStats[d].win / dayStats[d].total) * 100).toFixed(0) : 0);
    dayChart.update();

    sessionChart.data.datasets[0].data = [sessionPnl['Asia'], sessionPnl['London'], sessionPnl['New York']];
    sessionChart.update();

    winLossChart.data.datasets[0].data = [winCount, lossCount];
    winLossChart.update();
}

// Calendar Engine
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-label');
    if (!grid || !label) return;

    grid.innerHTML = '';
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    label.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const pnlByDate = {};
    trades.forEach(t => {
        if (!pnlByDate[t.date]) pnlByDate[t.date] = 0;
        pnlByDate[t.date] += parseFloat(t.pnl);
    });

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day bg-slate-900/30 border-none';
        grid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayPnl = pnlByDate[dateStr];

        const cell = document.createElement('div');
        let bgClass = 'bg-slate-900/80 text-slate-400';
        let pnlText = '';

        if (dayPnl !== undefined) {
            cell.classList.add('has-data');
            if (dayPnl > 0) {
                bgClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
                pnlText = `+$${dayPnl.toFixed(1)}`;
            } else if (dayPnl < 0) {
                bgClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
                pnlText = `-$${Math.abs(dayPnl).toFixed(1)}`;
            } else {
                bgClass = 'bg-slate-800 text-slate-300';
                pnlText = '$0';
            }
        }

        cell.className = `cal-day ${bgClass}`;
        cell.innerHTML = `
            <span class="text-[10px] font-bold text-slate-500">${day}</span>
            <span class="text-[10px]">${pnlText}</span>
        `;
        grid.appendChild(cell);
    }
}

document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('btn-next-month')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar();
});

// Render Journal Table & Stats
function renderJournal() {
    const journalTableBody = document.getElementById('journal-table-body');
    if (!journalTableBody) return;

    journalTableBody.innerHTML = '';
    let winCount = 0;
    let netPnl = 0;
    let grossWin = 0;
    let grossLoss = 0;

    trades.forEach((trade, index) => {
        const pnlNum = parseFloat(trade.pnl);
        netPnl += pnlNum;
        
        if (pnlNum > 0) {
            winCount++;
            grossWin += pnlNum;
        } else {
            grossLoss += Math.abs(pnlNum);
        }

        const row = document.createElement('tr');
        row.className = "border-b border-slate-800 hover:bg-slate-800/50 transition";
        
        const pnlClass = pnlNum >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
        const typeClass = trade.type === 'BUY' 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
            : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

        row.innerHTML = `
            <td class="p-3 font-medium text-slate-400">${trade.date}</td>
            <td class="p-3 font-medium text-slate-400">${trade.session || 'Asia'}</td>
            <td class="p-3"><span class="px-2 py-0.5 border rounded text-[10px] font-bold ${typeClass}">${trade.type}</span></td>
            <td class="p-3 text-slate-400 font-medium">${trade.setup || '-'}</td>
            <td class="p-3 font-medium">$${parseFloat(trade.entry).toFixed(2)}</td>
            <td class="p-3 font-medium">$${parseFloat(trade.exit).toFixed(2)}</td>
            <td class="p-3 font-medium">${trade.lot}</td>
            <td class="p-3 ${pnlClass}">${pnlNum >= 0 ? '+' : ''}$${pnlNum.toFixed(2)}</td>
            <td class="p-3 text-center">
                <button type="button" onclick="deleteTrade(${index})" class="text-slate-500 hover:text-rose-400 font-semibold transition">Hapus</button>
            </td>
        `;
        journalTableBody.appendChild(row);
    });

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : 0;
    const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : (grossWin > 0 ? "INF" : "0.00");
    
    document.getElementById('winrate-val').textContent = `${winRate}%`;
    document.getElementById('total-trades-val').textContent = totalTrades;
    document.getElementById('profit-factor-val').textContent = profitFactor;
    
    const totalPnlElem = document.getElementById('total-pnl-val');
    totalPnlElem.textContent = `${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`;
    totalPnlElem.className = `text-lg font-black drop-shadow ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

    localStorage.setItem('gold_trades_v5', JSON.stringify(trades));
    updateAnalytics();
    renderCalendar();
}

// Form Submit Event
document.getElementById('trade-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTrade = {
        date: document.getElementById('trade-date').value,
        session: document.getElementById('trade-session').value,
        type: document.getElementById('trade-type').value,
        setup: document.getElementById('trade-setup').value,
        entry: document.getElementById('trade-entry').value,
        exit: document.getElementById('trade-exit').value,
        lot: document.getElementById('trade-lot').value,
        pnl: parseFloat(document.getElementById('trade-pnl').value)
    };

    trades.unshift(newTrade);
    renderJournal();

    logConsole(`RECORDED: ${newTrade.type} XAUUSD @ ${newTrade.entry} | PnL: $${newTrade.pnl}`, 'TRADE');

    document.getElementById('trade-entry').value = '';
    document.getElementById('trade-exit').value = '';
    document.getElementById('trade-pnl').value = '';
});

function deleteTrade(index) {
    if (confirm('Hapus transaksi ini dari jurnal?')) {
        const deleted = trades.splice(index, 1)[0];
        renderJournal();
        logConsole(`DELETED: Trade ${deleted.date} (${deleted.type} @ ${deleted.entry})`, 'WARN');
    }
}

// Initial Log Sequence
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('trade-date').valueAsDate = new Date();
    initCharts();
    renderJournal();

    logConsole('SYSTEM: Initializing Gold Terminal Engine v5.0...', 'SYS');
    logConsole(`DATABASE: Loaded ${trades.length} trade record(s) from local storage.`, 'SYS');
    logConsole('MARKET DATA: XAUUSD Live Stream Connected.', 'SYS');
    logConsole('Terminal ready. Use command line below or navigate tabs.', 'INFO');
});
