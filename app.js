// 1. Inisialisasi TradingView Live Chart
new TradingView.widget({
    "width": "100%",
    "height": "100%",
    "symbol": "OANDA:XAUUSD",
    "interval": "60",
    "timezone": "Asia/Jakarta",
    "theme": "dark",
    "style": "1",
    "locale": "id",
    "toolbar_bg": "#f1f3f6",
    "enable_publishing": false,
    "allow_symbol_change": true,
    "container_id": "tradingview_gold"
});

// State Data Jurnal
let trades = JSON.parse(localStorage.getItem('gold_trades_v2')) || [];
let equityChart = null;

// DOM Elements
const calcBalance = document.getElementById('calc-balance');
const calcRisk = document.getElementById('calc-risk');
const calcSlPips = document.getElementById('calc-sl-pips');
const resRiskUsd = document.getElementById('res-risk-usd');
const resLot = document.getElementById('res-lot');

const tradeForm = document.getElementById('trade-form');
const journalTableBody = document.getElementById('journal-table-body');
const winrateVal = document.getElementById('winrate-val');
const totalPnlVal = document.getElementById('total-pnl-val');
const totalTradesVal = document.getElementById('total-trades-val');

// Tanggal default hari ini pada form
document.getElementById('trade-date').valueAsDate = new Date();

// 2. Logika Kalkulator Risk
function calculateRisk() {
    const balance = parseFloat(calcBalance.value) || 0;
    const riskPercent = parseFloat(calcRisk.value) || 0;
    const slPips = parseFloat(calcSlPips.value) || 0;

    const riskAmountUsd = balance * (riskPercent / 100);
    let lotSize = 0;
    
    if (slPips > 0) {
        lotSize = riskAmountUsd / (slPips * 10);
    }

    resRiskUsd.textContent = `$${riskAmountUsd.toFixed(2)}`;
    resLot.textContent = `${lotSize.toFixed(2)} Lot`;
}

[calcBalance, calcRisk, calcSlPips].forEach(input => {
    input.addEventListener('input', calculateRisk);
});
calculateRisk();

// 3. Render Inisialisasi Chart Equity
function initChart() {
    const ctx = document.getElementById('equityChart').getContext('2d');
    equityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Equity Growth ($)',
                data: [],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });
}

// Update Data Chart
function updateChart() {
    if (!equityChart) return;
    
    const sortedTrades = [...trades].reverse();
    let currentEquity = parseFloat(calcBalance.value) || 1000;
    const dataPoints = [currentEquity];
    const labels = ['Initial'];

    sortedTrades.forEach((t, i) => {
        currentEquity += parseFloat(t.pnl);
        dataPoints.push(currentEquity);
        labels.push(`T${i + 1}`);
    });

    equityChart.data.labels = labels;
    equityChart.data.datasets[0].data = dataPoints;
    equityChart.update();
}

// 4. Render Tabel Jurnal & Statistik
function renderJournal() {
    journalTableBody.innerHTML = '';
    let winCount = 0;
    let netPnl = 0;

    trades.forEach((trade, index) => {
        const pnlNum = parseFloat(trade.pnl);
        netPnl += pnlNum;
        if (pnlNum > 0) winCount++;

        const row = document.createElement('tr');
        row.className = "hover-row border-b border-slate-700/40";
        
        const pnlClass = pnlNum >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold';
        const typeClass = trade.type === 'BUY' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

        row.innerHTML = `
            <td class="p-3">${trade.date}</td>
            <td class="p-3"><span class="px-2 py-0.5 border rounded text-[10px] ${typeClass}">${trade.type}</span></td>
            <td class="p-3">$${parseFloat(trade.entry).toFixed(2)}</td>
            <td class="p-3">$${parseFloat(trade.exit).toFixed(2)}</td>
            <td class="p-3">${trade.lot}</td>
            <td class="p-3 ${pnlClass}">${pnlNum >= 0 ? '+' : ''}$${pnlNum.toFixed(2)}</td>
            <td class="p-3 text-center">
                <button onclick="deleteTrade(${index})" class="text-rose-400 hover:text-rose-300 font-medium">Hapus</button>
            </td>
        `;
        journalTableBody.appendChild(row);
    });

    // Stats
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : 0;
    
    winrateVal.textContent = `${winRate}%`;
    totalTradesVal.textContent = totalTrades;
    totalPnlVal.textContent = `${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`;
    totalPnlVal.className = `text-xl font-bold ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

    localStorage.setItem('gold_trades_v2', JSON.stringify(trades));
    updateChart();
}

// Input Submit Form Trade
tradeForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTrade = {
        date: document.getElementById('trade-date').value,
        type: document.getElementById('trade-type').value,
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
    if (confirm('Yakin ingin menghapus riwayat trade ini?')) {
        trades.splice(index, 1);
        renderJournal();
    }
}

// 5. Fitur Export / Import Data
document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (trades.length === 0) return alert('Belum ada data untuk di-export');
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Posisi,Entry,Exit,Lot,PnL\n";
    trades.forEach(t => {
        csvContent += `${t.date},${t.type},${t.entry},${t.exit},${t.lot},${t.pnl}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gold_journal_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('btn-export-json').addEventListener('click', () => {
    if (trades.length === 0) return alert('Belum ada data untuk di-export');
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
                alert('Berhasil mengimpor data jurnal!');
            }
        } catch (err) {
            alert('Format file JSON tidak valid.');
        }
    };
    if (e.target.files[0]) {
        fileReader.readAsText(e.target.files[0]);
    }
});

// App Startup
initChart();
renderJournal();
