/**
 * Gold Trading Command Center Pro v5.0
 * Pure Vanilla JavaScript Module
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. STATE & INITIALIZATION
    // ==========================================
    let accountType = 'standard'; // 'standard' or 'cent'
    let currentCalendarDate = new Date(2026, 8, 1); // September 2026

    // Default sample data if LocalStorage is empty
    const initialTrades = [
        { id: 1, date: '2026-09-01', session: 'London', type: 'BUY', setup: 'SND Breakout', entry: 2490.50, exit: 2502.10, lot: 0.10, pnl: 116.00 },
        { id: 2, date: '2026-09-02', session: 'New York', type: 'SELL', setup: 'SNR Rejection', entry: 2505.00, exit: 2512.00, lot: 0.10, pnl: -70.00 },
        { id: 3, date: '2026-09-03', session: 'New York', type: 'BUY', setup: 'News Scalping', entry: 2498.00, exit: 2515.50, lot: 0.15, pnl: 262.50 },
        { id: 4, date: '2026-09-04', session: 'Asia', type: 'SELL', setup: 'Trend Continuation', entry: 2510.20, exit: 2504.20, lot: 0.08, pnl: 48.00 },
        { id: 5, date: '2026-09-07', session: 'London', type: 'BUY', setup: 'SND Breakout', entry: 2500.00, exit: 2492.00, lot: 0.10, pnl: -80.00 }
    ];

    let trades = JSON.parse(localStorage.getItem('gold_terminal_trades')) || initialTrades;

    // Save initial trades if empty
    if (!localStorage.getItem('gold_terminal_trades')) {
        saveTradesToStorage();
    }

    // Chart instances
    let equityChart, dayChart, sessionChart, winLossChart;

    // ==========================================
    // 2. DOM ELEMENTS
    // ==========================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Risk Calc Inputs
    const btnAccStd = document.getElementById('btn-acc-std');
    const btnAccCent = document.getElementById('btn-acc-cent');
    const lblBalance = document.getElementById('lbl-balance');
    const calcBalance = document.getElementById('calc-balance');
    const calcRisk = document.getElementById('calc-risk');
    const calcSlPips = document.getElementById('calc-sl-pips');
    const resRiskUsd = document.getElementById('res-risk-usd');
    const resLot = document.getElementById('res-lot');

    // Journal Form
    const tradeForm = document.getElementById('trade-form');
    const tradeDateInput = document.getElementById('trade-date');
    const journalTableBody = document.getElementById('journal-table-body');

    // Header Stats
    const winrateVal = document.getElementById('winrate-val');
    const totalPnlVal = document.getElementById('total-pnl-val');
    const profitFactorVal = document.getElementById('profit-factor-val');
    const totalTradesVal = document.getElementById('total-trades-val');

    // Calendar
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarMonthLabel = document.getElementById('calendar-month-label');
    const btnPrevMonth = document.getElementById('btn-prev-month');
    const btnNextMonth = document.getElementById('btn-next-month');

    // Terminal
    const consoleStream = document.getElementById('console-stream');
    const consoleInput = document.getElementById('console-input');
    const btnClearConsole = document.getElementById('btn-clear-console');

    // Export/Import
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnExportJson = document.getElementById('btn-export-json');
    const fileImport = document.getElementById('file-import');

    // Set Default Form Date
    if (tradeDateInput) {
        tradeDateInput.value = new Date().toISOString().split('T')[0];
    }

    // ==========================================
    // 3. TAB NAVIGATION SYSTEM
    // ==========================================
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.id.replace('tab-btn-', 'tab-content-');

            tabBtns.forEach(b => {
                b.classList.remove('active-tab', 'text-slate-100', 'bg-amber-500/20', 'border-amber-500/40');
                b.classList.add('text-slate-400');
            });
            tabContents.forEach(c => c.classList.add('hidden'));

            btn.classList.add('active-tab', 'text-slate-100');
            btn.classList.remove('text-slate-400');

            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.remove('hidden');
            }

            // Re-render charts when switching tabs to fix zero-width canvas issues
            if (tabId === 'tab-content-analytics') {
                renderAnalyticsCharts();
            } else if (tabId === 'tab-content-dashboard') {
                renderEquityChart();
            }
        });
    });

    // Style active tab initially
    const activeInitialTab = document.getElementById('tab-btn-dashboard');
    if (activeInitialTab) {
        activeInitialTab.classList.add('bg-amber-500/20', 'border', 'border-amber-500/40', 'text-slate-100');
    }

    // ==========================================
    // 4. RISK & LOT CALCULATOR
    // ==========================================
    function calculateRisk() {
        const balance = parseFloat(calcBalance.value) || 0;
        const riskPercent = parseFloat(calcRisk.value) || 0;
        const slPips = parseFloat(calcSlPips.value) || 1;

        const riskUSD = balance * (riskPercent / 100);
        
        // For XAU/USD Standard Lot: 1 Pip (0.10 price move or 10 points) = $1 per 0.01 lot ($100/lot per $1 price move)
        // Contract Size: Standard = 100 oz ($1/pip/0.01 lot), Cent = 1 oz ($0.01/pip/0.01 lot)
        const pipValuePerMicroLot = accountType === 'standard' ? 0.10 : 0.001; // $ per pip for 0.01 lot
        
        let calculatedLot = (riskUSD / (slPips * (pipValuePerMicroLot * 100)));
        if (isNaN(calculatedLot) || calculatedLot < 0.01) calculatedLot = 0.01;

        resRiskUsd.textContent = `$${riskUSD.toFixed(2)}`;
        resLot.textContent = `${calculatedLot.toFixed(2)} Lot`;
    }

    btnAccStd.addEventListener('click', () => {
        accountType = 'standard';
        btnAccStd.className = 'px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-slate-950 shadow-sm transition';
        btnAccCent.className = 'px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-400 hover:text-slate-200 transition';
        lblBalance.textContent = 'Balance / Modal ($)';
        calculateRisk();
        logToTerminal('Risk Calculator Mode Switched to: STANDARD ACCOUNT');
    });

    btnAccCent.addEventListener('click', () => {
        accountType = 'cent';
        btnAccCent.className = 'px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-slate-950 shadow-sm transition';
        btnAccStd.className = 'px-2.5 py-1 text-[10px] font-bold rounded-md text-slate-400 hover:text-slate-200 transition';
        lblBalance.textContent = 'Balance / Modal (US Cents)';
        calculateRisk();
        logToTerminal('Risk Calculator Mode Switched to: CENT ACCOUNT');
    });

    [calcBalance, calcRisk, calcSlPips].forEach(input => {
        if (input) input.addEventListener('input', calculateRisk);
    });

    // ==========================================
    // 5. TRADINGVIEW CHART INITIALIZATION
    // ==========================================
    function initTradingViewChart() {
        if (typeof TradingView !== 'undefined' && document.getElementById('tradingview_gold')) {
            new TradingView.widget({
                "autosize": true,
                "symbol": "OANDA:XAUUSD",
                "interval": "60",
                "timezone": "Asia/Jakarta",
                "theme": "dark",
                "style": "1",
                "locale": "id",
                "toolbar_bg": "#0f172a",
                "enable_publishing": false,
                "hide_side_toolbar": false,
                "allow_symbol_change": true,
                "container_id": "tradingview_gold"
            });
        }
    }
    setTimeout(initTradingViewChart, 500);

    // ==========================================
    // 6. JOURNAL SYSTEM & DATA MANAGEMENT
    // ==========================================
    function saveTradesToStorage() {
        localStorage.setItem('gold_terminal_trades', JSON.stringify(trades));
    }

    function renderJournalTable() {
        journalTableBody.innerHTML = '';

        if (trades.length === 0) {
            journalTableBody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-slate-500 italic">Belum ada data jurnal. Silakan tambah trade baru.</td></tr>`;
            return;
        }

        // Sort trades by date descending
        const sortedTrades = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedTrades.forEach(t => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-800/50 transition border-b border-slate-800/60';
            
            const isProfit = t.pnl >= 0;
            const pnlColorClass = isProfit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
            const badgeTypeClass = t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

            row.innerHTML = `
                <td class="p-3 font-mono text-[11px]">${t.date}</td>
                <td class="p-3"><span class="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] border border-slate-700">${t.session}</span></td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-black border ${badgeTypeClass}">${t.type}</span></td>
                <td class="p-3 text-slate-300">${t.setup}</td>
                <td class="p-3 font-mono text-slate-300">${parseFloat(t.entry).toFixed(2)}</td>
                <td class="p-3 font-mono text-slate-300">${parseFloat(t.exit).toFixed(2)}</td>
                <td class="p-3 font-mono text-amber-400">${parseFloat(t.lot).toFixed(2)}</td>
                <td class="p-3 font-mono ${pnlColorClass}">${isProfit ? '+' : ''}$${parseFloat(t.pnl).toFixed(2)}</td>
                <td class="p-3 text-center">
                    <button data-id="${t.id}" class="btn-delete-trade text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1 rounded transition text-xs">🗑️</button>
                </td>
            `;
            journalTableBody.appendChild(row);
        });

        // Add Event Listeners for Delete
        document.querySelectorAll('.btn-delete-trade').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                deleteTrade(id);
            });
        });
    }

    tradeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newTrade = {
            id: Date.now(),
            date: document.getElementById('trade-date').value,
            session: document.getElementById('trade-session').value,
            type: document.getElementById('trade-type').value,
            setup: document.getElementById('trade-setup').value,
            entry: parseFloat(document.getElementById('trade-entry').value),
            exit: parseFloat(document.getElementById('trade-exit').value),
            lot: parseFloat(document.getElementById('trade-lot').value),
            pnl: parseFloat(document.getElementById('trade-pnl').value)
        };

        trades.push(newTrade);
        saveTradesToStorage();
        updateAllDashboardComponents();
        logToTerminal(`Trade Added: ${newTrade.type} XAUUSD @ ${newTrade.entry} | P/L: $${newTrade.pnl}`);

        // Reset form inputs except date
        document.getElementById('trade-entry').value = '';
        document.getElementById('trade-exit').value = '';
        document.getElementById('trade-lot').value = '';
        document.getElementById('trade-pnl').value = '';
    });

    function deleteTrade(id) {
        const tradeToDelete = trades.find(t => t.id === id);
        trades = trades.filter(t => t.id !== id);
        saveTradesToStorage();
        updateAllDashboardComponents();
        if (tradeToDelete) {
            logToTerminal(`Trade Deleted [ID: ${id}] | P/L was: $${tradeToDelete.pnl}`);
        }
    }

    // ==========================================
    // 7. STATS CALCULATIONS & HEADER
    // ==========================================
    function updateHeaderStats() {
        const totalTrades = trades.length;
        if (totalTrades === 0) {
            winrateVal.textContent = '0%';
            totalPnlVal.textContent = '$0.00';
            profitFactorVal.textContent = '0.00';
            totalTradesVal.textContent = '0';
            return;
        }

        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl < 0);

        const winrate = ((wins.length / totalTrades) * 100).toFixed(1);
        const totalPnl = trades.reduce((acc, t) => acc + t.pnl, 0);

        const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
        const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
        const profitFactor = grossLoss === 0 ? grossProfit.toFixed(2) : (grossProfit / grossLoss).toFixed(2);

        winrateVal.textContent = `${winrate}%`;
        totalPnlVal.textContent = `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`;
        totalPnlVal.className = `text-lg font-black ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'} drop-shadow`;
        profitFactorVal.textContent = profitFactor;
        totalTradesVal.textContent = totalTrades;
    }

    // ==========================================
    // 8. MONTHLY CALENDAR PERFORMANCE
    // ==========================================
    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();

        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        calendarMonthLabel.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Group trades by date (YYYY-MM-DD)
        const tradesByDate = {};
        trades.forEach(t => {
            if (!tradesByDate[t.date]) tradesByDate[t.date] = 0;
            tradesByDate[t.date] += t.pnl;
        });

        // Empty slots before 1st day of month
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'bg-slate-900/30 rounded-lg p-2 min-h-[50px] border border-slate-800/30';
            calendarGrid.appendChild(emptyDiv);
        }

        // Fill month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayPnl = tradesByDate[dateString];

            const dayCard = document.createElement('div');
            let bgStyle = 'bg-slate-900/60 border-slate-800';
            let pnlDisplay = '';

            if (dayPnl !== undefined) {
                if (dayPnl > 0) {
                    bgStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                    pnlDisplay = `<span class="text-[9px] font-mono font-bold block mt-1">+$${dayPnl.toFixed(0)}</span>`;
                } else if (dayPnl < 0) {
                    bgStyle = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
                    pnlDisplay = `<span class="text-[9px] font-mono font-bold block mt-1">-$${Math.abs(dayPnl).toFixed(0)}</span>`;
                } else {
                    bgStyle = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                    pnlDisplay = `<span class="text-[9px] font-mono font-bold block mt-1">$0</span>`;
                }
            }

            dayCard.className = `p-1.5 rounded-lg border min-h-[52px] text-left flex flex-col justify-between transition hover:border-slate-600 ${bgStyle}`;
            dayCard.innerHTML = `
                <span class="text-[10px] font-bold text-slate-400">${day}</span>
                ${pnlDisplay}
            `;
            calendarGrid.appendChild(dayCard);
        }
    }

    btnPrevMonth.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    btnNextMonth.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    // ==========================================
    // 9. CHARTS (CHART.JS INTEGRATION)
    // ==========================================
    function renderEquityChart() {
        const ctx = document.getElementById('equityChart');
        if (!ctx) return;

        if (equityChart) equityChart.destroy();

        // Sort trades ascending by date
        const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let cumulativePnl = 0;
        const labels = ['Start'];
        const data = [0];

        sorted.forEach((t, idx) => {
            cumulativePnl += t.pnl;
            labels.push(`T#${idx + 1}`);
            data.push(cumulativePnl);
        });

        equityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cumulative Equity ($)',
                    data: data,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
                    y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } }
                }
            }
        });
    }

    function renderAnalyticsCharts() {
        // 1. Day Chart (Win Rate per Day)
        const dayCtx = document.getElementById('dayChart');
        if (dayCtx) {
            if (dayChart) dayChart.destroy();

            const daysMap = { 'Senin': { win: 0, total: 0 }, 'Selasa': { win: 0, total: 0 }, 'Rabu': { win: 0, total: 0 }, 'Kamis': { win: 0, total: 0 }, 'Jumat': { win: 0, total: 0 } };
            const dayNamesID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

            trades.forEach(t => {
                const dayIndex = new Date(t.date).getDay();
                const dayName = dayNamesID[dayIndex];
                if (daysMap[dayName]) {
                    daysMap[dayName].total += 1;
                    if (t.pnl > 0) daysMap[dayName].win += 1;
                }
            });

            const dayLabels = Object.keys(daysMap);
            const dayWinrates = dayLabels.map(d => daysMap[d].total > 0 ? ((daysMap[d].win / daysMap[d].total) * 100).toFixed(0) : 0);

            dayChart = new Chart(dayCtx, {
                type: 'bar',
                data: {
                    labels: dayLabels,
                    datasets: [{
                        data: dayWinrates,
                        backgroundColor: '#3b82f6',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
                        y: { max: 100, ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => v + '%' }, grid: { color: 'rgba(51, 65, 85, 0.3)' } }
                    }
                }
            });
        }

        // 2. Session Chart (P/L per Session)
        const sessionCtx = document.getElementById('sessionChart');
        if (sessionCtx) {
            if (sessionChart) sessionChart.destroy();

            const sessionsMap = { 'Asia': 0, 'London': 0, 'New York': 0 };
            trades.forEach(t => {
                if (sessionsMap[t.session] !== undefined) {
                    sessionsMap[t.session] += t.pnl;
                }
            });

            sessionChart = new Chart(sessionCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(sessionsMap),
                    datasets: [{
                        data: Object.values(sessionsMap),
                        backgroundColor: Object.values(sessionsMap).map(v => v >= 0 ? '#10b981' : '#f43f5e'),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
                        y: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => '$' + v }, grid: { color: 'rgba(51, 65, 85, 0.3)' } }
                    }
                }
            });
        }

        // 3. Win Loss Doughnut Chart
        const winLossCtx = document.getElementById('winLossChart');
        if (winLossCtx) {
            if (winLossChart) winLossChart.destroy();

            const wins = trades.filter(t => t.pnl > 0).length;
            const losses = trades.filter(t => t.pnl < 0).length;
            const breakevens = trades.filter(t => t.pnl === 0).length;

            winLossChart = new Chart(winLossCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Win', 'Loss', 'BE'],
                    datasets: [{
                        data: [wins, losses, breakevens],
                        backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } }
                    },
                    cutout: '70%'
                }
            });
        }
    }

    // Update all dashboard elements
    function updateAllDashboardComponents() {
        renderJournalTable();
        updateHeaderStats();
        renderCalendar();
        renderEquityChart();
        calculateRisk();
    }

    // ==========================================
    // 10. EXPORT & IMPORT DATA
    // ==========================================
    btnExportCsv.addEventListener('click', () => {
        if (trades.length === 0) return alert('Tidak ada data jurnal untuk diexport.');

        let csvContent = "data:text/csv;charset=utf-8,ID,Tanggal,Sesi,Tipe,Setup,Entry,Exit,Lot,PnL\n";
        trades.forEach(t => {
            csvContent += `${t.id},${t.date},${t.session},${t.type},"${t.setup}",${t.entry},${t.exit},${t.lot},${t.pnl}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `gold_journal_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        logToTerminal('Exported journal data to CSV file.');
    });

    btnExportJson.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trades, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `gold_terminal_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        logToTerminal('Backup JSON file generated successfully.');
    });

    fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedTrades = JSON.parse(event.target.result);
                if (Array.isArray(importedTrades)) {
                    trades = importedTrades;
                    saveTradesToStorage();
                    updateAllDashboardComponents();
                    logToTerminal(`Imported ${importedTrades.length} trades from JSON backup.`);
                    alert('Data jurnal berhasil diimport!');
                } else {
                    alert('Format file JSON tidak valid.');
                }
            } catch (err) {
                alert('Gagal membaca file JSON.');
            }
        };
        reader.readAsText(file);
    });

    // ==========================================
    // 11. TERMINAL STREAM & COMMAND LINE (CLI)
    // ==========================================
    function logToTerminal(message, type = 'info') {
        if (!consoleStream) return;

        const now = new Date();
        const timestamp = now.toTimeString().split(' ')[0];
        
        const logRow = document.createElement('div');
        logRow.className = 'flex items-start gap-2 font-mono text-xs';

        let typeBadge = '<span class="text-emerald-400">[INFO]</span>';
        if (type === 'error') typeBadge = '<span class="text-rose-400">[ERROR]</span>';
        if (type === 'cmd') typeBadge = '<span class="text-amber-400">[CMD]</span>';
        if (type === 'system') typeBadge = '<span class="text-blue-400">[SYS]</span>';

        logRow.innerHTML = `
            <span class="text-slate-500">${timestamp}</span>
            ${typeBadge}
            <span class="text-slate-200">${message}</span>
        `;

        consoleStream.appendChild(logRow);
        consoleStream.scrollTop = consoleStream.scrollHeight;
    }

    // Initial Logs
    logToTerminal('Initializing Gold Terminal Command Center v5.0...', 'system');
    logToTerminal('Connected to XAU/USD Price Data Feed [Latency 12ms]', 'system');
    logToTerminal(`Loaded ${trades.length} existing trade journal records from LocalStorage.`);
    logToTerminal('Type /help for list of available CLI commands.');

    btnClearConsole.addEventListener('click', () => {
        consoleStream.innerHTML = '';
        logToTerminal('Console log cleared.');
    });

    // Command Input Processor
    consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const inputVal = consoleInput.value.trim();
            if (!inputVal) return;

            logToTerminal(inputVal, 'cmd');
            consoleInput.value = '';

            processCLICommand(inputVal);
        }
    });

    function processCLICommand(cmdStr) {
        const parts = cmdStr.split(' ');
        const mainCmd = parts[0].toLowerCase();

        switch (mainCmd) {
            case '/help':
                logToTerminal('--- AVAILABLE COMMANDS ---', 'system');
                logToTerminal('/help - Menampilkan daftar perintah ini');
                logToTerminal('/clear - Membersihkan tampilan konsol');
                logToTerminal('/stats - Menampilkan ringkasan statistik trading');
                logToTerminal('/risk [balance] [risk%] [sl_pips] - Menghitung rekomendasi lot cepat');
                logToTerminal('/add [type:BUY/SELL] [entry] [exit] [lot] [pnl] - Tambah trade instan');
                logToTerminal('/reset - Menghapus seluruh data jurnal (Hati-hati)');
                break;

            case '/clear':
                consoleStream.innerHTML = '';
                logToTerminal('Console cleared.');
                break;

            case '/stats':
                const total = trades.length;
                const wins = trades.filter(t => t.pnl > 0).length;
                const pnlSum = trades.reduce((a, b) => a + b.pnl, 0);
                const wr = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

                logToTerminal(`STATISTIK: Total Trade: ${total} | Win Rate: ${wr}% | Total PnL: $${pnlSum.toFixed(2)}`, 'system');
                break;

            case '/risk':
                if (parts.length >= 4) {
                    const bal = parseFloat(parts[1]);
                    const rsk = parseFloat(parts[2]);
                    const sl = parseFloat(parts[3]);

                    const riskUSD = bal * (rsk / 100);
                    const pipVal = accountType === 'standard' ? 0.10 : 0.001;
                    let lot = (riskUSD / (sl * (pipVal * 100)));
                    if (isNaN(lot) || lot < 0.01) lot = 0.01;

                    logToTerminal(`HASIL KALKULASI RISIKO: Modal: $${bal} | Resiko: $${riskUSD.toFixed(2)} (${rsk}%) | Rekomendasi Lot: ${lot.toFixed(2)} Lot`, 'system');
                } else {
                    logToTerminal('Penggunaan salah! Contoh: /risk 1000 1 30', 'error');
                }
                break;

            case '/add':
                if (parts.length >= 6) {
                    const type = parts[1].toUpperCase();
                    const entry = parseFloat(parts[2]);
                    const exit = parseFloat(parts[3]);
                    const lot = parseFloat(parts[4]);
                    const pnl = parseFloat(parts[5]);

                    if ((type === 'BUY' || type === 'SELL') && !isNaN(pnl)) {
                        const newT = {
                            id: Date.now(),
                            date: new Date().toISOString().split('T')[0],
                            session: 'New York',
                            type: type,
                            setup: 'CLI Execution',
                            entry: entry || 0,
                            exit: exit || 0,
                            lot: lot || 0.01,
                            pnl: pnl
                        };
                        trades.push(newT);
                        saveTradesToStorage();
                        updateAllDashboardComponents();
                        logToTerminal(`Trade berhasil ditambahkan via CLI: ${type} P/L $${pnl}`, 'system');
                    } else {
                        logToTerminal('Format parameter salah.', 'error');
                    }
                } else {
                    logToTerminal('Penggunaan salah! Contoh: /add BUY 2490 2500 0.10 100', 'error');
                }
                break;

            case '/reset':
                if (confirm('Apakah Anda yakin ingin menghapus SELURUH data jurnal?')) {
                    trades = [];
                    saveTradesToStorage();
                    updateAllDashboardComponents();
                    logToTerminal('Seluruh data jurnal telah dihapus!', 'error');
                }
                break;

            default:
                logToTerminal(`Perintah '${mainCmd}' tidak dikenali. Ketik /help untuk bantuan.`, 'error');
                break;
        }
    }

    // Initial render call
    updateAllDashboardComponents();
});
