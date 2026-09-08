// State Management & Local Storage
let trades = JSON.parse(localStorage.getItem('gold_trades')) || [];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCalculator();
  initJournal();
  initPerformance();
  initDictionary();
  initDashboard();

  // Load awal data dashboard & performance
  updateDashboardStats();
  updatePerformanceStats();

  // Reset Data Handler
  document.getElementById('resetData')?.addEventListener('click', () => {
    if (confirm('Yakin ingin menghapus seluruh data jurnal dan statistik?')) {
      localStorage.removeItem('gold_trades');
      trades = [];
      updateDashboardStats();
      updatePerformanceStats();
      renderJournalTable();
      alert('Data berhasil di-reset.');
    }
  });
});

// Navigation Logic
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav');
  const pages = document.querySelectorAll('.page');
  const pageTitle = document.getElementById('pageTitle');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pageTarget = btn.getAttribute('data-page');

      navButtons.forEach(b => b.classList.remove('active'));
      pages.forEach(p => p.classList.remove('active-page'));

      btn.classList.add('active');
      document.getElementById(pageTarget)?.classList.add('active-page');

      if (pageTitle) {
        pageTitle.textContent = btn.querySelector('span').textContent;
      }

      // Refresh data jika pindah ke dashboard/performance
      if (pageTarget === 'dashboard') updateDashboardStats();
      if (pageTarget === 'performance') updatePerformanceStats();
    });
  });
}

// Dashboard Update Logic
function updateDashboardStats() {
  const totalTradesEl = document.getElementById('dTrades');
  const winRateEl = document.getElementById('dWin');
  const pnlEl = document.getElementById('dPnL');
  const execLossEl = document.getElementById('dExec');

  const total = trades.length;
  const wins = trades.filter(t => Number(t.pnl) > 0).length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  const netPnL = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const execLosses = trades.filter(t => t.lossType === 'Execution Loss').length;

  if (totalTradesEl) totalTradesEl.textContent = total;
  if (winRateEl) winRateEl.textContent = `${winRate}%`;
  if (pnlEl) {
    pnlEl.textContent = `${netPnL >= 0 ? '+' : ''}$${netPnL.toFixed(2)}`;
    pnlEl.style.color = netPnL >= 0 ? '#10b981' : '#ef4444';
  }
  if (execLossEl) execLossEl.textContent = execLosses;
}

// Calculator Logic
function initCalculator() {
  const calcBtn = document.getElementById('calc');
  const centInput = document.getElementById('centBalance');

  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      const balance = parseFloat(document.getElementById('balance').value) || 0;
      const riskPct = parseFloat(document.getElementById('riskPct').value) || 0;
      const entry = parseFloat(document.getElementById('entry').value) || 0;
      const sl = parseFloat(document.getElementById('sl').value) || 0;
      const tp = parseFloat(document.getElementById('tp').value) || 0;
      const contract = parseFloat(document.getElementById('contract').value) || 100;
      const lotStep = parseFloat(document.getElementById('lotStep').value) || 0.01;

      const riskAmount = (balance * riskPct) / 100;
      const slPips = Math.abs(entry - sl);
      const tpPips = Math.abs(tp - entry);

      if (slPips === 0) {
        alert('Stop Loss (SL) tidak boleh sama dengan Entry Price.');
        return;
      }

      // Calculation Formula
      let lotSize = riskAmount / (slPips * contract);
      lotSize = Math.floor(lotSize / lotStep) * lotStep; // Adjust to Lot Step

      const rewardAmount = lotSize * tpPips * contract;
      const rrRatio = (tpPips / slPips).toFixed(2);

      const resultBox = document.getElementById('calcResult');
      resultBox.innerHTML = `
        <b>Hasil Kalkulasi:</b><br>
        • Risiko Modal ($): <b>$${riskAmount.toFixed(2)}</b><br>
        • Ukuran Lot Ide: <b style="color: #f59e0b; font-size: 16px;">${lotSize.toFixed(2)} Lot</b><br>
        • Target Profit ($): <b>+$${rewardAmount.toFixed(2)}</b><br>
        • Risk to Reward Ratio (RR): <b>1 : ${rrRatio}</b>
      `;
    });
  }

  if (centInput) {
    centInput.addEventListener('input', (e) => {
      const usdVal = parseFloat(e.target.value) || 0;
      const cents = usdVal * 100;
      document.getElementById('centDisplay').textContent = `${cents.toLocaleString('en-US')} cents`;
    });
  }
}

// Journal Logic
function initJournal() {
  const saveBtn = document.getElementById('saveTrade');
  renderJournalTable();

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const trade = {
        id: Date.now(),
        date: document.getElementById('jDate').value || new Date().toISOString().split('T')[0],
        dir: document.getElementById('jDir').value,
        entry: parseFloat(document.getElementById('jEntry').value) || 0,
        sl: parseFloat(document.getElementById('jSL').value) || 0,
        tp: parseFloat(document.getElementById('jTP').value) || 0,
        exit: parseFloat(document.getElementById('jExit').value) || 0,
        lot: parseFloat(document.getElementById('jLot').value) || 0,
        pnl: parseFloat(document.getElementById('jPnL').value) || 0,
        strategy: document.getElementById('jStrategy').value || '-',
        session: document.getElementById('jSession').value,
        emotion: document.getElementById('jEmotion').value,
        lossType: document.getElementById('jLoss').value,
        reason: document.getElementById('jReason').value || '-',
        lesson: document.getElementById('jLesson').value || '-'
      };

      trades.unshift(trade);
      localStorage.setItem('gold_trades', JSON.stringify(trades));

      renderJournalTable();
      updateDashboardStats();
      updatePerformanceStats();

      alert('Transaksi berhasil disimpan!');
    });
  }
}

function renderJournalTable() {
  const tbody = document.getElementById('tradeBody');
  if (!tbody) return;

  if (trades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Belum ada riwayat transaksi.</td></tr>`;
    return;
  }

  tbody.innerHTML = trades.map(t => `
    <tr>
      <td>${t.date}</td>
      <td style="color: ${t.dir === 'BUY' ? '#10b981' : '#ef4444'}; font-weight:700;">${t.dir}</td>
      <td>${t.entry.toFixed(2)}</td>
      <td>${t.exit.toFixed(2)}</td>
      <td style="color: ${t.pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight:700;">${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}</td>
      <td>${t.strategy}</td>
      <td>${t.lossType}</td>
      <td style="text-align: right;">
        <button class="delete" onclick="deleteTrade(${t.id})"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function deleteTrade(id) {
  if (confirm('Hapus log transaksi ini?')) {
    trades = trades.filter(t => t.id !== id);
    localStorage.setItem('gold_trades', JSON.stringify(trades));
    renderJournalTable();
    updateDashboardStats();
    updatePerformanceStats();
  }
}

// Performance Logic
function initPerformance() {
  document.getElementById('periodFilter')?.addEventListener('change', updatePerformanceStats);
}

function updatePerformanceStats() {
  const pnlEl = document.getElementById('pnl');
  const winrateEl = document.getElementById('winrate');
  const pfEl = document.getElementById('pf');
  const avgwinEl = document.getElementById('avgwin');

  const filter = document.getElementById('periodFilter')?.value || 'all';
  let filtered = [...trades];

  const now = new Date();
  if (filter === 'day') {
    const today = now.toISOString().split('T')[0];
    filtered = trades.filter(t => t.date === today);
  } else if (filter === 'month') {
    const month = now.toISOString().slice(0, 7);
    filtered = trades.filter(t => t.date?.startsWith(month));
  } else if (filter === 'year') {
    const year = now.getFullYear().toString();
    filtered = trades.filter(t => t.date?.startsWith(year));
  }

  const total = filtered.length;
  const wins = filtered.filter(t => Number(t.pnl) > 0);
  const losses = filtered.filter(t => Number(t.pnl) < 0);

  const netPnL = filtered.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const totalWinAmount = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const totalLossAmount = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));

  const winRate = total > 0 ? ((wins.length / total) * 100).toFixed(1) : '0.0';
  const profitFactor = totalLossAmount > 0 ? (totalWinAmount / totalLossAmount).toFixed(2) : (totalWinAmount > 0 ? 'MAX' : '0.00');
  const avgWin = wins.length > 0 ? (totalWinAmount / wins.length).toFixed(2) : '0.00';

  if (pnlEl) {
    pnlEl.textContent = `$${netPnL.toFixed(2)}`;
    pnlEl.style.color = netPnL >= 0 ? '#10b981' : '#ef4444';
  }
  if (winrateEl) winrateEl.textContent = `${winRate}%`;
  if (pfEl) pfEl.textContent = profitFactor;
  if (avgwinEl) avgwinEl.textContent = `$${avgWin}`;

  // Breakdown Loss
  const lossBreakdownEl = document.getElementById('lossBreakdown');
  if (lossBreakdownEl) {
    const stratLoss = filtered.filter(t => t.lossType === 'Strategy Loss').length;
    const execLoss = filtered.filter(t => t.lossType === 'Execution Loss').length;
    lossBreakdownEl.innerHTML = `
      • Strategy Loss: <b>${stratLoss}</b><br>
      • Execution Loss (Disiplin/Mental): <b>${execLoss}</b>
    `;
  }
}

// Dictionary Logic
function initDictionary() {
  const terms = [
    { name: 'BOS (Break of Structure)', desc: 'Kondisi ketika harga menembus level High/Low sebelumnya, menandakan kelanjutan trend.' },
    { name: 'CHoCH (Change of Character)', desc: 'Tanda-tanda awal perubahan arah trend saat struktur harga patah.' },
    { name: 'Spread', desc: 'Selisih antara harga Ask (beli) dan Bid (jual) yang menjadi biaya untuk broker.' },
    { name: 'Lot', desc: 'Satuan ukuran volume transaksi dalam pasar forex/gold.' },
    { name: 'Cent Account', desc: 'Akun trading yang menggunakan satuan Cent (1 USD = 100 Cent) untuk mengecilkan nominal risiko.' }
  ];

  const searchInput = document.getElementById('dictSearch');
  const dictList = document.getElementById('dictList');

  function renderDict(filterText = '') {
    if (!dictList) return;
    const filtered = terms.filter(t => t.name.toLowerCase().includes(filterText.toLowerCase()) || t.desc.toLowerCase().includes(filterText.toLowerCase()));
    dictList.innerHTML = filtered.map(t => `
      <div class="term">
        <b>${t.name}</b>
        <p>${t.desc}</p>
      </div>
    `).join('');
  }

  renderDict();
  searchInput?.addEventListener('input', (e) => renderDict(e.target.value));
}

function initDashboard() {
  // Sync Daily Bias
  document.getElementById('dashBias')?.addEventListener('change', (e) => {
    localStorage.setItem('gold_bias', e.target.value);
  });

  const savedBias = localStorage.getItem('gold_bias');
  if (savedBias && document.getElementById('dashBias')) {
    document.getElementById('dashBias').value = savedBias;
  }
                                  }
