// util.js — petits helpers partagés par les écrans.

export function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function formatDateFR(iso) {
  if (!iso) return "Jamais";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}min${String(s).padStart(2, "0")}`;
}
