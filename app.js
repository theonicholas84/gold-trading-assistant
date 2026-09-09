// 1. Live TradingView Chart (Light Theme)
new TradingView.widget({
    "width": "100%",
    "height": "100%",
    "symbol": "OANDA:XAUUSD",
    "interval": "60",
    "timezone": "Asia/Jakarta",
    "theme": "light",
    "style": "1",
    "locale": "id",
    "toolbar_bg": "#f1f3f6",
    "enable_publishing": false,
    "allow_symbol_change": true,
    "container_id": "tradingview_gold"
});

// 2. Init Economic Calendar Widget (Light Theme)
const eventsWidgetContainer = document.getElementById('tradingview_events');
if (eventsWidgetContainer) {
    eventsWidgetContainer.innerHTML = JSON.stringify({
        "colorTheme": "light",
        "isTransparent": false,
        "width": "100%",
        "height": "100%",
        "locale": "id",
        "importanceFilter": "0,1",
        "currencyFilter": "USD"
    });
}

// Global State
let trades = JSON.parse(localStorage.getItem('gold_trades_v3')) || [];
let equityChart = null;
let isCentAccount = false;

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
    btnAccStd.className = "px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white shadow-sm";
    btnAccCent.className = "px-2 py-0.5 text-[10px] font-bold rounded text-gray-500";
    lblBalance.textContent = "Balance / Modal ($)";
    calculateRisk();
});

btnAccCent.addEventListener('click', () => {
    isCentAccount = true;
    btnAccCent.className = "px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white shadow-sm";
    btnAccStd.className = "px-2 py-0.5 text-[10px] font-bold rounded text-gray-500";
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

    const unitSymbol = isCentAccount ? 'Cent' : '$';
    resRiskUsd.textContent = `${unitSymbol}${riskAmount.toFixed(2)}`;
    resLot.textContent = `${lotSize.toFixed(2)} Lot`;
}

[calcBalance, calcRisk, calcSlPips].forEach(input => {
    input.addEventListener('input', calculateRisk);
});
calculateRisk();

// Equity Curve Graph (Light Styling)
function initChart() {
    const ctx = document.getElementById('equityChart').getContext('2d');
    equityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Equity ($)',
                data: [],
                borderColor: '#d97706',
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#64748b', font: { size: 10 } }
                }
            }
        }
    });
}

function updateChart() {
    if (!equityChart) return;
    const sortedTrades = [...trades].reverse();
    let currentEquity = parseFloat(calcBalance.value) || 1000;
    const dataPoints = [currentEquity];
    const labels = ['Start'];

    sortedTrades.forEach((t, i) => {
        currentEquity += parseFloat(t.pnl);
        dataPoints.push(currentEquity);
        labels.push(`T${i + 1}`);
    });

    equityChart.data.labels = labels;
    equityChart.data.datasets[0].data = dataPoints;
    equityChart.update();
}

// Render Table & Stats
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
        row.className = "border-b border-gray-100 hover:bg-gray-50";
        
        const pnlClass = pnlNum >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
        const typeClass = trade.type === 'BUY' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border-rose-200';

        row.innerHTML = `
            <td class="p-2.5">${trade.date}</td>
            <td class="p-2.5"><span class="px-2 py-0.5 border rounded text-[10px] font-bold ${typeClass}">${trade.type}</span></td>
            <td class="p-2.5 text-gray-500">${trade.setup || '-'}</td>
            <td class="p-2.5">$${parseFloat(trade.entry).toFixed(2)}</td>
            <td class="p-2.5">$${parseFloat(trade.exit).toFixed(2)}</td>
            <td class="p-2.5">${trade.lot}</td>
            <td class="p-2.5 ${pnlClass}">${pnlNum >= 0 ? '+' : ''}$${pnlNum.toFixed(2)}</td>
            <td class="p-2.5 text-center">
                <button onclick="deleteTrade(${index})" class="text-rose-500 hover:text-rose-700 font-semibold">Hapus</button>
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

    localStorage.setItem('gold_trades_v3', JSON.stringify(trades));
    updateChart();
}

// Form Submit
tradeForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTrade = {
        date: document.getElementById('trade-date').value,
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

// Backup CSV/JSON
document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (trades.length === 0) return alert('Belum ada data.');
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Posisi,Setup,Entry,Exit,Lot,PnL\n";
    trades.forEach(t => {
        csvContent += `${t.date},${t.type},${t.setup || ''},${t.entry},${t.exit},${t.lot},${t.pnl}\n`;
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

initChart();
renderJournal();
