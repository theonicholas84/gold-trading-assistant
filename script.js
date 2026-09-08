const $=id=>document.getElementById(id);
const key="goldTA_v1";
let trades=JSON.parse(localStorage.getItem(key)||"[]");

document.querySelectorAll(".nav").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));btn.classList.add("active");document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));$(btn.dataset.page).classList.add("active-page");$("pageTitle").textContent=btn.textContent.replace(/^[^A-Za-z]+/,"").trim(); if(btn.dataset.page==="performance")renderPerformance(); if(btn.dataset.page==="journal")renderJournal(); if(btn.dataset.page==="dictionary")renderDict();});

function save(){localStorage.setItem(key,JSON.stringify(trades));}
function money(n){return "$"+Number(n||0).toFixed(2)}
function calcMetrics(arr=trades){
 const wins=arr.filter(t=>+t.pnl>0), losses=arr.filter(t=>+t.pnl<0);
 const gp=wins.reduce((a,t)=>a+ +t.pnl,0), gl=Math.abs(losses.reduce((a,t)=>a+ +t.pnl,0));
 return {n:arr.length,w:wins.length,l:losses.length,wr:arr.length?wins.length/arr.length*100:0,pnl:gp-gl,pf:gl?gp/gl:0,avgw:wins.length?gp/wins.length:0,exec:arr.filter(t=>t.loss==="Execution Loss").length,strat:arr.filter(t=>t.loss==="Strategy Loss").length};
}
function updateDash(){const m=calcMetrics();$("dTrades").textContent=m.n;$("dWin").textContent=m.wr.toFixed(1)+"%";$("dPnL").textContent=money(m.pnl);$("dExec").textContent=m.exec;}
updateDash();

$("validate").onclick=()=>{const checks=[...document.querySelectorAll("#dashboard .check input")];const n=checks.filter(x=>x.checked).length;const pct=n/checks.length*100;$("quality").innerHTML=`<b>${pct.toFixed(0)}% — ${pct>=75?"READY FOR REVIEW":"WAIT"}</b><br>${n}/${checks.length} checklist items complete. Checklist bukan jaminan trade profit.`};

$("calc").onclick=()=>{
 const bal=+$("balance").value,risk=+$("riskPct").value/100,entry=+$("entry").value,sl=+$("sl").value,tp=+$("tp").value,cs=+$("contract").value,step=+$("lotStep").value;
 const dist=Math.abs(entry-sl), riskMoney=bal*risk, perLot=dist*cs;
 let raw=perLot?riskMoney/perLot:0; let lot=step?Math.floor(raw/step)*step:raw;
 const rr=dist?Math.abs(tp-entry)/dist:0, profit=perLot?lot*cs*Math.abs(tp-entry):0;
 $("calcResult").innerHTML=`Maximum loss: <b>${money(riskMoney)}</b><br>SL distance: <b>${dist.toFixed(2)}</b><br>Estimated lot: <b>${lot.toFixed(2)}</b><br>R:R: <b>1:${rr.toFixed(2)}</b><br>Potential gross profit: <b>${money(profit)}</b><br><small class="muted">Formula assumes XAU/USD P/L = price move × contract size × lots. Verify your broker's specification.</small>`;
};
$("centBalance").oninput=()=>{$("centDisplay").textContent=(+$("centBalance").value*100).toLocaleString("en-US")+" cents"};

$("jDate").value=new Date().toISOString().slice(0,10);
$("saveTrade").onclick=()=>{
 const t={id:Date.now(),date:$("jDate").value,dir:$("jDir").value,entry:+$("jEntry").value,sl:+$("jSL").value,tp:+$("jTP").value,exit:+$("jExit").value,lot:+$("jLot").value,pnl:+$("jPnL").value,strategy:$("jStrategy").value||"Unspecified",session:$("jSession").value,emotion:$("jEmotion").value,loss:$("jLoss").value,reason:$("jReason").value,lesson:$("jLesson").value};
 if(!t.date||!Number.isFinite(t.pnl)){alert("Isi minimal Date dan P/L.");return} trades.push(t);save();renderJournal();updateDash();alert("Trade tersimpan di browser.");
};
function renderJournal(){$("tradeBody").innerHTML=trades.slice().reverse().map(t=>`<tr><td>${t.date}</td><td>${t.dir}</td><td>${t.entry}</td><td>${t.exit}</td><td>${money(t.pnl)}</td><td>${t.strategy}</td><td>${t.loss}</td><td><button class="delete" onclick="delTrade(${t.id})">Hapus</button></td></tr>`).join("")||`<tr><td colspan="8" class="muted">Belum ada trade.</td></tr>`}
window.delTrade=id=>{trades=trades.filter(t=>t.id!==id);save();renderJournal();updateDash();renderPerformance()};
function filtered(period){const now=new Date();return trades.filter(t=>{const d=new Date(t.date+"T12:00:00");if(period==="day")return d.toDateString()===now.toDateString();if(period==="month")return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();if(period==="year")return d.getFullYear()===now.getFullYear();return true})}
function renderPerformance(){const m=calcMetrics();$("pnl").textContent=money(m.pnl);$("winrate").textContent=m.wr.toFixed(1)+"%";$("pf").textContent=m.pf.toFixed(2);$("avgwin").textContent=money(m.avgw);const f=filtered($("periodFilter").value),fm=calcMetrics(f);$("periodSummary").innerHTML=`Trades: <b>${fm.n}</b> • Wins: <b>${fm.w}</b> • Losses: <b>${fm.l}</b> • Win rate: <b>${fm.wr.toFixed(1)}%</b> • Net P/L: <b>${money(fm.pnl)}</b>`;$("lossBreakdown").innerHTML=`Strategy Loss: <b>${m.strat}</b><br>Execution Loss: <b>${m.exec}</b>`;const sessions={};trades.forEach(t=>sessions[t.session]=(sessions[t.session]||0)+ +t.pnl);$("tradingData").innerHTML=Object.entries(sessions).map(([k,v])=>`${k}: <b>${money(v)}</b>`).join("<br>")||"Belum ada data."}
$("periodFilter").onchange=renderPerformance;

const dict=[["BOS","Break of Structure — harga menembus struktur swing penting."],["CHoCH","Change of Character — perubahan karakter/struktur market."],["FVG","Fair Value Gap — area ketidakseimbangan harga yang sering dipantau trader."],["Spread","Selisih antara Bid dan Ask."],["Leverage","Fasilitas yang memperbesar eksposur; juga memperbesar risiko."],["Margin","Dana yang diperlukan untuk mempertahankan posisi."],["Lot","Ukuran posisi trading."],["R:R","Perbandingan potensi risiko terhadap potensi reward."],["Drawdown","Penurunan equity/balance dari puncak sebelumnya."],["Equity","Nilai akun termasuk floating P/L."],["Balance","Saldo akun setelah transaksi yang sudah terealisasi."]];
function renderDict(){const q=$("dictSearch").value.toLowerCase();$("dictList").innerHTML=dict.filter(x=>x[0].toLowerCase().includes(q)||x[1].toLowerCase().includes(q)).map(x=>`<div class="term"><b>${x[0]}</b><p>${x[1]}</p></div>`).join("")}
$("dictSearch").oninput=renderDict;renderDict();renderJournal();renderPerformance();
$("resetData").onclick=()=>{if(confirm("Hapus semua journal?")){trades=[];save();renderJournal();renderPerformance();updateDash()}};
