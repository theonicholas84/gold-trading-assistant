// 1. Live TradingView Chart
new TradingView.widget({
    "width": "100%",
    "height": "100%",
    "symbol": "OANDA:XAUUSD",
    "interval": "60",
    "timezone": "Asia/Jakarta",
    "theme": "light",
    "style": "1",
    "locale": "id",
    "toolbar_bg": "#f8fafc",
    "enable_publishing": false,
    "allow_symbol_change": true,
    "container_id": "tradingview_gold"
});

// Global State
let trades = JSON.parse(localStorage.getItem('gold_trades_v4')) || [];
let isCentAccount = false;
let currentCalDate = new Date();

// Charts
let equityChart = null;
let dayChart = null;
let sessionChart = null;
let winLossChart = null;

// DOM Selectors
const calcBalance = document.getElementById('calc-balance');
const calcRisk = document.getElementById('calc-risk');
const calcSlPips = document.getElementById('calc-sl-pips');
const resRiskUsd = document.getElementById('res-risk-usd');
const resLot = document.getElementById('res-lot');
const btnAccStd = document.getElementById('btn-acc-std');
const btnAccCent = document.getElementById('btn-acc-cent');
const lblBalance = document.getElementById('lbl-balance');

const tradeForm = document.getElementById('trade-form');
const journalTableBody = document.getElementById('journal-table-body');
const winrateVal = document.getElementById('winrate-val');
const totalPnlVal = document.getElementById('total-pnl-val');
const profitFactorVal = document.getElementById('profit-factor-val');
const totalTradesVal = document.getElementById('total-trades-val');

document.getElementById('trade-date').valueAsDate = new Date();

// Toggle Akun Standard / Cent
btnAccStd.addEventListener('click', () => {
    isCentAccount = false;
    btnAccStd.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-white shadow-sm transition";
    btnAccCent.className = "px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
    lblBalance.textContent = "Balance / Modal ($)";
    calculateRisk();
});

btnAccCent.addEventListener('click', () => {
    isCentAccount = true;
    btnAccCent.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-white shadow-sm transition";
    btnAccStd.className = "px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
    lblBalance.textContent = "Balance / Modal (Cent)";
    calculateRisk();
});

// Risk Calculator Logic
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

// Initialize All Analytics Charts
function initCharts() {
    // 1. Equity Line Chart
    const ctxEquity = document.getElementById('equityChart').getContext('2d');
    equityChart = new Chart(ctxEquity, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Equity ($)', data: [], borderColor: '#d97706', backgroundColor: 'rgba(217, 119, 6, 0.08)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 10 } } } } }
    });

    // 2. Day Chart (Senin - Jumat)
    const ctxDay = document.getElementById('dayChart').getContext('2d');
    dayChart = new Chart(ctxDay, {
        type: 'bar',
        data: { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'], datasets: [{ label: 'Win Rate %', data: [0,0,0,0,0], backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { callback: v => v+'%' } } } }
    });

    // 3. Session Chart (Asia, London, NY)
    const ctxSession = document.getElementById('sessionChart').getContext('2d');
    sessionChart = new Chart(ctxSession, {
        type: 'bar',
        data: { labels: ['Asia', 'London', 'New York'], datasets: [{ label: 'P/L ($)', data: [0,0,0], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 4. Win vs Loss Donut Chart
    const ctxWinLoss = document.getElementById('winLossChart').getContext('2d');
    winLossChart = new Chart(ctxWinLoss, {
        type: 'doughnut',
        data: { labels: ['Win', 'Loss'], datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
    });
}

// Update Charts Data
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

    // Day Analytics (0=Sun, 1=Mon, ..., 5=Fri)
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

    // Update Day Chart
    const dayWinRates = [1,2,3,4,5].map(d => dayStats[d].total > 0 ? ((dayStats[d].win / dayStats[d].total) * 100).toFixed(0) : 0);
    dayChart.data.datasets[0].data = dayWinRates;
    dayChart.update();

    // Update Session Chart
    sessionChart.data.datasets[0].data = [sessionPnl['Asia'], sessionPnl['London'], sessionPnl['New York']];
    sessionChart.update();

    // Update Win/Loss Chart
    winLossChart.data.datasets[0].data = [winCount, lossCount];
    winLossChart.update();
}

// Render Monthly Calendar
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

    // Group P/L by YYYY-MM-DD
    const pnlByDate = {};
    trades.forEach(t => {
        if (!pnlByDate[t.date]) pnlByDate[t.date] = 0;
        pnlByDate[t.date] += parseFloat(t.pnl);
    });

    // Empty Slots before Day 1
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day bg-slate-50/50 border-none';
        grid.appendChild(emptyCell);
    }

    // Days of Month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayPnl = pnlByDate[dateStr];

        const cell = document.createElement('div');
        let bgClass = 'bg-slate-50 text-slate-600';
        let pnlText = '';

        if (dayPnl !== undefined) {
            cell.classList.add('has-data');
            if (dayPnl > 0) {
                bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
                pnlText = `+$${dayPnl.toFixed(1)}`;
            } else if (dayPnl < 0) {
                bgClass = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
                pnlText = `-$${Math.abs(dayPnl).toFixed(1)}`;
            } else {
                bgClass = 'bg-slate-100 text-slate-700';
                pnlText = '$0';
            }
        }

        cell.className = `cal-day ${bgClass}`;
        cell.innerHTML = `
            <span class="text-[10px] font-bold text-slate-400">${day}</span>
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
        row.className = "border-b border-slate-100 hover:bg-slate-50/80 transition";
        
        const pnlClass = pnlNum >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
        const typeClass = trade.type === 'BUY' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border-rose-200';

        row.innerHTML = `
            <td class="p-3 font-medium text-slate-600">${trade.date}</td>
            <td class="p-3 font-medium text-slate-500">${trade.session || 'Asia'}</td>
            <td class="p-3"><span class="px-2 py-0.5 border rounded text-[10px] font-bold ${typeClass}">${trade.type}</span></td>
            <td class="p-3 text-slate-500 font-medium">${trade.setup || '-'}</td>
            <td class="p-3 font-medium">$${parseFloat(trade.entry).toFixed(2)}</td>
            <td class="p-3 font-medium">$${parseFloat(trade.exit).toFixed(2)}</td>
            <td class="p-3 font-medium">${trade.lot}</td>
            <td class="p-3 ${pnlClass}">${pnlNum >= 0 ? '+' : ''}$${pnlNum.toFixed(2)}</td>
            <td class="p-3 text-center">
                <button type="button" onclick="deleteTrade(${index})" class="text-slate-400 hover:text-rose-600 font-semibold transition">Hapus</button>
            </td>
        `;
        journalTableBody.appendChild(row);
    });

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : 0;
    const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : (grossWin > 0 ? "INF" : "0.00");
    
    winrateVal.textContent = `${winRate}%`;
    totalTradesVal.textContent = totalTrades;
    profitFactorVal.textContent = profitFactor;
    totalPnlVal.textContent = `${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`;
    totalPnlVal.className = `text-lg font-bold ${netPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;

    localStorage.setItem('gold_trades_v4', JSON.stringify(trades));
    updateAnalytics();
    renderCalendar();
}

// Form Submit
tradeForm.addEventListener('submit', (e) => {
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

    document.getElementById('trade-entry').value = '';
    document.getElementById('trade-exit').value = '';
    document.getElementById('trade-pnl').value = '';
});

function deleteTrade(index) {
    if (confirm('Hapus transaksi ini dari jurnal?')) {
        trades.splice(index, 1);
        renderJournal();
    }
}

// Export CSV / JSON & Import
document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (trades.length === 0) return alert('Belum ada data.');
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Sesi,Posisi,Setup,Entry,Exit,Lot,PnL\n";
    trades.forEach(t => {
        csvContent += `${t.date},${t.session || ''},${t.type},${t.setup || ''},${t.entry},${t.exit},${t.lot},${t.pnl}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `journal_gold_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('btn-export-json').addEventListener('click', () => {
    if (trades.length === 0) return alert('Belum ada data.');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trades, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_journal_gold.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

document.getElementById('file-import').addEventListener('change', (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
        try {
            const importedTrades = JSON.parse(event.target.result);
            if (Array.isArray(importedTrades)) {
                trades = importedTrades;
                renderJournal();
                alert('Data jurnal berhasil diimpor!');
            }
        } catch (err) {
            alert('File JSON tidak valid.');
        }
    };
    if (e.target.files[0]) {
        fileReader.readAsText(e.target.files[0]);
    }
});

// App Initialization
initCharts();
renderJournal();
