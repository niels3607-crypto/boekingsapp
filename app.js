/* Boekingsoverzicht — alle data wordt lokaal in de browser bewaard (localStorage). */

const STORAGE_KEY = "boekingsoverzicht.boekingen.v1";
const SETTINGS_KEY = "boekingsoverzicht.instellingen.v1";

const el = (id) => document.getElementById(id);

const euro = (n) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n || 0);

function loadBoekingen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Kon boekingen niet laden", e);
    return [];
  }
}

function saveBoekingen(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { commissiePercentage: 15 };
  } catch (e) {
    return { commissiePercentage: 15 };
  }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

let boekingen = loadBoekingen();
let settings = loadSettings();

function uid() {
  return "b_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function statusClass(status) {
  if (status === "open") return "status-open";
  if (status === "betaald door promotor") return "status-pending";
  return "status-done";
}

function isSameMonth(dateStr, ref) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function computeStats(list) {
  const open = list.filter((b) => b.status === "open");
  const pending = list.filter((b) => b.status === "betaald door promotor");
  const now = new Date();
  const commissieMaand = list
    .filter((b) => isSameMonth(b.datum, now))
    .reduce((sum, b) => sum + (Number(b.commissie) || 0), 0);

  return {
    openCount: open.length,
    openAmount: open.reduce((sum, b) => sum + (Number(b.gage) || 0), 0),
    pendingCount: pending.length,
    pendingAmount: pending.reduce(
      (sum, b) => sum + Math.max(0, (Number(b.gage) || 0) - (Number(b.kosten) || 0) - (Number(b.commissie) || 0)),
      0
    ),
    commissieMaand,
  };
}

function renderStats() {
  const s = computeStats(boekingen);
  el("statOpenCount").textContent = s.openCount;
  el("statOpenAmount").textContent = `${euro(s.openAmount)} nog te ontvangen`;
  el("statPendingAmount").textContent = euro(s.pendingAmount);
  el("statPendingCount").textContent = `${s.pendingCount} boeking${s.pendingCount === 1 ? "" : "en"}`;
  el("statCommissieMaand").textContent = euro(s.commissieMaand);
  const monthLabel = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(new Date());
  el("statCommissieMaandLabel").textContent = monthLabel;
}

function uniekeArtiesten() {
  return [...new Set(boekingen.map((b) => b.artiest).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "nl")
  );
}

function renderArtiestFilter() {
  const select = el("filterArtiest");
  const huidige = select.value;
  const artiesten = uniekeArtiesten();
  select.innerHTML =
    '<option value="alle">Alle artiesten</option>' +
    artiesten.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");
  if (artiesten.includes(huidige)) select.value = huidige;
}

function renderArtiestSuggesties() {
  const datalist = el("artiestSuggesties");
  datalist.innerHTML = uniekeArtiesten()
    .map((a) => `<option value="${escapeHtml(a)}"></option>`)
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatDatum(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function getFiltered() {
  const status = el("filterStatus").value;
  const artiest = el("filterArtiest").value;
  const zoek = el("filterZoek").value.trim().toLowerCase();

  return boekingen
    .filter((b) => status === "alle" || b.status === status)
    .filter((b) => artiest === "alle" || b.artiest === artiest)
    .filter((b) => {
      if (!zoek) return true;
      return (
        (b.promotor || "").toLowerCase().includes(zoek) ||
        (b.notitie || "").toLowerCase().includes(zoek) ||
        (b.artiest || "").toLowerCase().includes(zoek)
      );
    })
    .sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
}

function renderTable() {
  const list = getFiltered();
  const tbody = el("tableBody");
  const emptyState = el("emptyState");

  if (boekingen.length === 0) {
    tbody.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("p").innerHTML =
      "Nog geen boekingen. Klik op <strong>+ Nieuwe boeking</strong> om te beginnen.";
    return;
  }
  if (list.length === 0) {
    tbody.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("p").innerHTML = "Geen boekingen gevonden met dit filter.";
    return;
  }
  emptyState.hidden = true;

  tbody.innerHTML = list
    .map((b) => {
      return `
      <tr data-id="${b.id}">
        <td>${formatDatum(b.datum)}</td>
        <td class="row-artist">${escapeHtml(b.artiest || "—")}</td>
        <td>${escapeHtml(b.promotor || "—")}</td>
        <td class="num">${euro(b.gage)}</td>
        <td class="num">${euro(b.kosten)}</td>
        <td class="num">${euro(b.commissie)}</td>
        <td><span class="status-badge ${statusClass(b.status)}">${escapeHtml(b.status)}</span></td>
        <td></td>
      </tr>`;
    })
    .join("");

  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => openModal(tr.dataset.id));
  });
}

function renderAll() {
  renderStats();
  renderArtiestFilter();
  renderArtiestSuggesties();
  renderTable();
}

/* ---------- Modal / formulier ---------- */

function openModal(id) {
  const form = el("bookingForm");
  form.reset();
  el("btnDelete").hidden = true;
  el("bookingId").value = "";
  el("aiTekst").value = "";
  setAiParseStatus("");
  resetAiReminder();

  if (id) {
    const b = boekingen.find((x) => x.id === id);
    if (!b) return;
    el("modalTitle").textContent = "Boeking bewerken";
    el("bookingId").value = b.id;
    el("fArtiest").value = b.artiest || "";
    el("fPromotor").value = b.promotor || "";
    el("fDatum").value = b.datum || "";
    el("fGage").value = b.gage ?? "";
    el("fKosten").value = b.kosten ?? 0;
    el("fCommissie").value = b.commissie ?? "";
    el("fCommissiePct").value = "";
    el("fStatus").value = b.status || "open";
    el("fNotitie").value = b.notitie || "";
    el("btnDelete").hidden = false;
    el("aiReminderBox").hidden = b.status === "uitbetaald aan artiest";
  } else {
    el("modalTitle").textContent = "Nieuwe boeking";
    el("fStatus").value = "open";
    el("fKosten").value = 0;
    el("fCommissiePct").value = settings.commissiePercentage || "";
    el("aiReminderBox").hidden = true;
  }

  el("modalOverlay").hidden = false;
  el("fArtiest").focus();
}

function closeModal() {
  el("modalOverlay").hidden = true;
}

function recalcCommissieVanPercentage() {
  const gage = Number(el("fGage").value) || 0;
  const pct = Number(el("fCommissiePct").value);
  if (pct >= 0 && el("fGage").value !== "") {
    el("fCommissie").value = ((gage * pct) / 100).toFixed(2);
  }
}

function handleSubmit(evt) {
  evt.preventDefault();
  const id = el("bookingId").value || uid();
  const pct = Number(el("fCommissiePct").value);
  if (pct >= 0) settings.commissiePercentage = pct, saveSettings(settings);

  const boeking = {
    id,
    artiest: el("fArtiest").value.trim(),
    promotor: el("fPromotor").value.trim(),
    datum: el("fDatum").value,
    gage: Number(el("fGage").value) || 0,
    kosten: Number(el("fKosten").value) || 0,
    commissie: Number(el("fCommissie").value) || 0,
    status: el("fStatus").value,
    notitie: el("fNotitie").value.trim(),
  };

  const idx = boekingen.findIndex((b) => b.id === id);
  if (idx >= 0) boekingen[idx] = boeking;
  else boekingen.push(boeking);

  saveBoekingen(boekingen);
  closeModal();
  renderAll();
}

function handleDelete() {
  const id = el("bookingId").value;
  if (!id) return;
  if (!confirm("Deze boeking verwijderen? Dit kan niet ongedaan gemaakt worden.")) return;
  boekingen = boekingen.filter((b) => b.id !== id);
  saveBoekingen(boekingen);
  closeModal();
  renderAll();
}

/* ---------- CSV-export ---------- */

function exportCsv() {
  const headers = ["Datum", "Artiest", "Promotor", "Gage", "Kosten", "Commissie", "Status", "Notitie"];
  const rows = getFiltered().map((b) => [
    b.datum || "",
    b.artiest || "",
    b.promotor || "",
    b.gage ?? 0,
    b.kosten ?? 0,
    b.commissie ?? 0,
    b.status || "",
    (b.notitie || "").replace(/\n/g, " "),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `boekingen-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- AI-feature 1: bericht plakken -> formulier invullen ----------
   Stuurt de geplakte tekst naar een Netlify Function (netlify/functions/parse-boeking.js),
   die Claude vraagt om er gestructureerde boekingsgegevens uit te halen. De AI slaat
   nooit rechtstreeks iets op — het formulier wordt alleen voorgevuld, jij controleert
   en klikt zelf op "Opslaan". */

async function callAiFunction(path, payload) {
  let resp;
  try {
    resp = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new Error("kon de AI-functie niet bereiken (ben je online?)");
  }

  let data = null;
  try {
    data = await resp.json();
  } catch (e) {
    // Geen (geldige) JSON terug — gebeurt bv. als de site niet op Netlify draait
    // en deze functie dus niet bestaat (lokale server, of drag-and-drop zonder functions).
    throw new Error("AI-functie niet gevonden. Werkt alleen op Netlify met functions + API-sleutel.");
  }

  if (!resp.ok) throw new Error(data.error || "onbekende fout");
  return data;
}

function setAiParseStatus(msg, isError = false) {
  const status = el("aiParseStatus");
  status.textContent = msg;
  status.classList.toggle("is-error", isError);
}

async function handleAiParse() {
  const tekst = el("aiTekst").value.trim();
  if (!tekst) {
    setAiParseStatus("Plak eerst een bericht.", true);
    return;
  }
  const btn = el("btnAiParse");
  btn.disabled = true;
  setAiParseStatus("Bezig met invullen…");

  try {
    const data = await callAiFunction("/.netlify/functions/parse-boeking", { tekst });

    if (data.artiest) el("fArtiest").value = data.artiest;
    if (data.promotor) el("fPromotor").value = data.promotor;
    if (data.datum) el("fDatum").value = data.datum;
    if (data.gage != null) {
      el("fGage").value = data.gage;
      recalcCommissieVanPercentage();
    }
    if (data.notitie) el("fNotitie").value = data.notitie;

    setAiParseStatus("Ingevuld — controleer de velden voordat je opslaat.");
  } catch (e) {
    setAiParseStatus("Kon niet automatisch invullen: " + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

/* ---------- AI-feature 2: herinneringsbericht genereren ----------
   Stuurt de boekinggegevens naar netlify/functions/genereer-herinnering.js, die Claude
   vraagt een kort, vriendelijk betalingsherinnerings-bericht op te stellen richting de
   promotor. Jij kopieert en verstuurt het zelf — er wordt niets automatisch verzonden. */

function resetAiReminder() {
  el("aiReminderResultWrap").hidden = true;
  el("aiReminderResult").value = "";
  el("aiReminderStatus").textContent = "";
  el("aiReminderStatus").classList.remove("is-error");
}

async function handleAiReminder() {
  const id = el("bookingId").value;
  const bestaandeBoeking = boekingen.find((b) => b.id === id);
  const boeking = bestaandeBoeking || {
    artiest: el("fArtiest").value,
    promotor: el("fPromotor").value,
    datum: el("fDatum").value,
    gage: Number(el("fGage").value) || 0,
    status: el("fStatus").value,
    notitie: el("fNotitie").value,
  };

  const btn = el("btnAiReminder");
  btn.disabled = true;
  el("aiReminderStatus").textContent = "Bezig met opstellen…";
  el("aiReminderStatus").classList.remove("is-error");

  try {
    const data = await callAiFunction("/.netlify/functions/genereer-herinnering", { boeking });

    el("aiReminderResult").value = data.tekst || "";
    el("aiReminderResultWrap").hidden = false;
    el("aiReminderStatus").textContent = "";
  } catch (e) {
    el("aiReminderStatus").textContent = "Kon geen bericht genereren: " + e.message;
    el("aiReminderStatus").classList.add("is-error");
  } finally {
    btn.disabled = false;
  }
}

function copyReminderText() {
  const text = el("aiReminderResult").value;
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const btn = el("btnCopyReminder");
      const origineel = btn.textContent;
      btn.textContent = "Gekopieerd!";
      setTimeout(() => (btn.textContent = origineel), 1500);
    })
    .catch(() => alert("Kopiëren is niet gelukt. Selecteer de tekst handmatig."));
}

/* ---------- Event listeners ---------- */

el("btnAdd").addEventListener("click", () => openModal(null));
el("btnCloseModal").addEventListener("click", closeModal);
el("btnCancel").addEventListener("click", closeModal);
el("btnDelete").addEventListener("click", handleDelete);
el("bookingForm").addEventListener("submit", handleSubmit);
el("modalOverlay").addEventListener("click", (evt) => {
  if (evt.target === el("modalOverlay")) closeModal();
});
document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape" && !el("modalOverlay").hidden) closeModal();
});

el("fGage").addEventListener("input", recalcCommissieVanPercentage);
el("fCommissiePct").addEventListener("input", recalcCommissieVanPercentage);

el("filterStatus").addEventListener("change", renderTable);
el("filterArtiest").addEventListener("change", renderTable);
el("filterZoek").addEventListener("input", renderTable);
el("btnExport").addEventListener("click", exportCsv);

el("btnAiParse").addEventListener("click", handleAiParse);
el("btnAiReminder").addEventListener("click", handleAiReminder);
el("btnCopyReminder").addEventListener("click", copyReminderText);
el("fStatus").addEventListener("change", () => {
  const heeftId = !!el("bookingId").value;
  el("aiReminderBox").hidden = !heeftId || el("fStatus").value === "uitbetaald aan artiest";
  if (!el("aiReminderBox").hidden) resetAiReminder();
});

renderAll();
