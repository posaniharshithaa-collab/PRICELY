import { buildEstimatedContext, makeHistory } from "../core/estimation-engine.js";
import { calculateDealScore, scoreReasons, scoreBreakdown } from "../core/deal-score.js";
import { decisionFor } from "../core/decision-engine.js";

const $ = id => document.getElementById(id);
let product = null, context = null, selectedDays = 90;

function money(v, c = "INR") {
  if (!Number.isFinite(Number(v))) return "—";
  const symbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const symbol = symbols[c] || (c ? c + " " : "");
  const locale = c === "INR" ? "en-IN" : "en-US";
  return symbol + Math.round(v).toLocaleString(locale);
}
function sendToPage(message) { window.parent?.postMessage(message, "*"); }
async function getProduct() {
  if (window.parent !== window) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 2500);
      const handler = event => {
        if (event.source !== window.parent || event.data?.type !== "PRICELY_PRODUCT_RESPONSE") return;
        clearTimeout(timer); window.removeEventListener("message", handler); resolve(event.data.product || null);
      };
      window.addEventListener("message", handler);
      sendToPage({ type: "PRICELY_REQUEST_PRODUCT" });
    });
  }
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (t?.id) {
      const r = await chrome.tabs.sendMessage(t.id, { type: "GET_PRODUCT" });
      if (r?.product) return r.product;
    }
  } catch (_) {}
  return null;
}
function setScreen(id) {
  ["landing", "scanning", "results"].forEach(x => $(x).classList.toggle("hidden", x !== id));
  $("ready").classList.toggle("scanning", id === "scanning");
  $("ready").innerHTML = `<span></span> ${id === "scanning" ? "SCANNING" : "READY"}`;
}
function drawChart(history, currency) {
  if (!history?.length) return;
  const svg = $("chart"), w = 348, h = 132, left = 8, right = 5, top = 14, bottom = 23;
  const vals = history.map(x => x.price), min = Math.min(...vals), max = Math.max(...vals), range = Math.max(1, max - min);
  const pts = history.map((p, i) => [left + i / Math.max(1, history.length - 1) * (w - left - right), top + (max - p.price) / range * (h - top - bottom)]);
  const path = pts.map((p, i) => (i ? "L" : "M") + ` ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = path + ` L ${pts.at(-1)[0]} ${h-bottom} L ${pts[0][0]} ${h-bottom} Z`;
  const ys = [max, min + range / 2, min];
  const grid = ys.map((v, i) => { const y = top + i / 2 * (h - top - bottom); return `<line x1="${left}" y1="${y}" x2="${w-right}" y2="${y}" class="grid"/><text x="${left}" y="${y-3}" class="ylabel">${money(v, currency)}</text>`; }).join("");
  const first = history[0]?.date || "", mid = history[Math.floor(history.length / 2)]?.date || "", last = history.at(-1)?.date || "";
  const labels = `<text x="${left}" y="${h-4}" class="xlabel">${first}</text><text x="${w/2-15}" y="${h-4}" class="xlabel">${mid}</text><text x="${w-right-40}" y="${h-4}" class="xlabel">${last}</text>`;
  const lp = pts.at(-1);
  svg.innerHTML = grid + `<path d="${area}" class="area"/><path d="${path}" class="line"/><circle cx="${lp[0]}" cy="${lp[1]}" r="3.5" class="dotc"/>` + labels;
  $("nowLabel").textContent = money(history.at(-1).price, currency);
  $("nowLabel").style.top = Math.max(17, Math.min(94, lp[1] - 9)) + "px";
}
function renderHistory(days = selectedDays) {
  if (!product || !context) return;
  selectedDays = days;
  const hist = makeHistory(product.currentPrice, context.typical, context.lowest, context.highest, days);
  drawChart(hist, product.currency);
  $("m1").textContent = money(product.currentPrice, product.currency);
  $("m2").textContent = money(context.typical, product.currency);
  $("m3").textContent = money(Math.min(...hist.map(x => x.price)), product.currency);
  $("m4").textContent = money(Math.max(...hist.map(x => x.price)), product.currency);
}
function render() {
  if (!product || !context) return;
  $("name").textContent = product.productName || "Product";
  $("retailer").textContent = product.retailer || "Current site";
  $("price").textContent = money(product.currentPrice, product.currency);
  const meta = [];
  if (product.mrp && product.mrp > product.currentPrice) meta.push(`${Math.round((1 - product.currentPrice / product.mrp) * 100)}% below MRP`);
  if (product.evidence) meta.push(product.evidence === "visible text" ? "page price evidence" : "retailer price evidence");
  $("priceMeta").textContent = meta.join(" · ");
  const img = $("img"), thumb = $("thumb"); img.style.display = "none"; thumb.classList.add("empty");
  if (product.image) { img.onload = () => { img.style.display = "block"; thumb.classList.remove("empty"); }; img.src = product.image; }
  const hist = makeHistory(product.currentPrice, context.typical, context.lowest, context.highest, 90);
  const trend = hist.at(-1).price < hist.at(-3).price ? "down" : hist.at(-1).price > hist.at(-3).price ? "up" : "stable";
  const score = calculateDealScore({ current: product.currentPrice, typical: context.typical, lowest: context.lowest, highest: context.highest, trend, confidence: context.confidence });
  const decision = decisionFor(score, context.confidence);
  $("vtitle").textContent = decision.title; $("vdetail").textContent = decision.detail;
  const tone = decision.tone === "positive" ? "var(--green)" : decision.tone === "negative" ? "var(--red)" : "var(--amber)";
  $("vdot").style.background = tone; $("vtitle").style.color = tone; $("score").textContent = score;
  $("reasons").innerHTML = scoreReasons({ current: product.currentPrice, typical: context.typical, lowest: context.lowest, trend }).map(x => `<div class="reason">${x}</div>`).join("");
  $("historyType").textContent = context.type === "verified" ? "OBSERVED HISTORY" : "ESTIMATED REFERENCE";
  $("lowBadge").textContent = (context.type === "verified" ? "Lowest observed " : "Est. low ") + money(context.lowest, product.currency);
  $("lowBadgeSub").textContent = context.type === "verified" ? "verified observation" : "model reference";
  $("marketBadge").textContent = product.offers?.length > 1 ? "Market offers" : "Market context";
  $("marketBadgeSub").textContent = product.offers?.length > 1 ? `${product.offers.length} detected offers` : (product.launchDate ? "launch + age + current price" : "current price + conservative model");
  $("source").textContent = context.type === "verified" ? "Based on verified historical observations available to PRICELY for this product." : "Estimated from available MRP/launch anchors, product age, current market price and a conservative trend model. Not presented as verified historical observations.";
  if (product.offers?.length > 1) { $("comparisonNotice").classList.remove("hidden"); $("comparisonNotice").innerHTML = `<strong>CROSS-RETAILER SIGNAL</strong><br>${product.offers.map(o => `${o.retailer}: ${money(o.price, o.currency || product.currency)}`).join(" · ")}`; } else $("comparisonNotice").classList.add("hidden");
  renderHistory(90);
}
async function analyze() {
  setScreen("scanning");
  $("landingStatus").textContent = "Reading this product page…";
  await new Promise(r => setTimeout(r, 650));
  product = await getProduct();
  if (!product?.currentPrice) { $("landingStatus").textContent = "Price not detected. PRICELY couldn't identify a reliable selling price on this page."; setScreen("landing"); return; }
  context = buildEstimatedContext({ currentPrice: product.currentPrice, mrp: product.mrp, launchDate: product.launchDate });
  setScreen("results"); render();
}
function openModal(title, body, eyebrow = "PRICELY") { $("modalEyebrow").textContent = eyebrow; $("modalTitle").textContent = title; $("modalBody").innerHTML = body; $("infoModal").classList.remove("hidden"); }
function closeModal() { $("infoModal").classList.add("hidden"); }

$("analyzeBtn").addEventListener("click", analyze);
$("reanalyzeBtn").addEventListener("click", analyze);
$("backBtn").addEventListener("click", () => { product = null; context = null; setScreen("landing"); refreshLanding(); });
$("minBtn").addEventListener("click", () => sendToPage({ type: "PRICELY_MINIMIZE" }));
$("closeBtn").addEventListener("click", () => sendToPage({ type: "PRICELY_CLOSE" }));
$("scoreCollapse").addEventListener("click", () => $("score-card").classList.toggle("collapsed"));
$("scoreInfo").addEventListener("click", e => { e.stopPropagation(); const b = context && product ? scoreBreakdown({ current: product.currentPrice, typical: context.typical, lowest: context.lowest, highest: context.highest, trend: "stable", confidence: context.confidence }) : null; openModal("How Deal Signal works", `<p>Deal Signal estimates how attractive the current price is relative to the available reference signals.</p><div class="weight"><span>Typical-price position</span><b>35%</b></div><div class="weight"><span>Reference-range position</span><b>30%</b></div><div class="weight"><span>Low-price proximity</span><b>20%</b></div><div class="weight"><span>Recent movement</span><b>15%</b></div>${b ? `<p class="modal-note">Current model inputs: typical ${money(context.typical, product.currency)}, low ${money(context.lowest, product.currency)}, high ${money(context.highest, product.currency)}.</p>` : ""}<p class="modal-note"><strong>The score does not predict future prices.</strong> It summarizes the price evidence available to PRICELY at analysis time.</p>`, "DEAL SIGNAL"); });
$("sourceInfo").addEventListener("click", e => { e.stopPropagation(); openModal("Data source & confidence", `<p>PRICELY separates observed evidence from modeled reference values.</p><p><strong>Current price:</strong> read from retailer-native elements, structured product data or visible page price evidence.</p><p><strong>Reference history:</strong> modeled when verified historical observations are unavailable.</p><p class="modal-note">Estimated references are not presented as verified historical observations.</p>`, "DATA SOURCE"); });
$("modalClose").addEventListener("click", closeModal);
$("infoModal").addEventListener("click", e => { if (e.target === $("infoModal")) closeModal(); });
$("viewBtn").addEventListener("click", () => { if (product?.url) sendToPage({ type: "PRICELY_OPEN_URL", url: product.url }); });
document.querySelectorAll(".tabs button").forEach(btn => btn.addEventListener("click", () => { document.querySelectorAll(".tabs button").forEach(x => x.classList.remove("active")); btn.classList.add("active"); renderHistory(Number(btn.dataset.days)); }));
async function refreshLanding() { const p = await getProduct(); $("landingStatus").textContent = p?.currentPrice ? `${p.productName || "Product page"} · ${money(p.currentPrice, p.currency)}` : "No product detected yet"; }
window.addEventListener("message", event => { if (event.data?.type === "PRICELY_PAGE_CHANGED") { product = null; context = null; setScreen("landing"); $("landingStatus").textContent = "Product page changed · ready to analyze again"; } });
setScreen("landing");
refreshLanding();
