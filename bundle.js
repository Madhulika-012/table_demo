/* ───────── Fallback ───────── */
const fallback = {
  columns: [{ key: "status", label: "Status" }],
  rows: [{ status: "UI loaded correctly" }]
};

let originalData = fallback;
let filteredRows = fallback.rows;
let activeFilters = {};

/* Columns with dropdown filters (added severity) */
const FILTERABLE_COLUMNS = {
  risk_type: true,
  responsible_department: true,
  severity: true
};

/* ───────── Helpers ───────── */
function getUniqueValues(rows, key) {
  return [...new Set(rows.map(r => r[key]).filter(Boolean))];
}

/**
 * Severity coloring:
 * - accepts "High/Medium/Low" (case-insensitive)
 * - also supports numeric 1–5 mapping:
 *    1–2 => Low (green)
 *    3   => Medium (amber)
 *    4–5 => High (red)
 */
function getRiskClass(value = "") {
  const v = String(value ?? "").trim().toLowerCase();

  if (v === "high") return "td-risk-high";
  if (v === "medium") return "td-risk-medium";
  if (v === "low") return "td-risk-low";

  const n = Number(v);
  if (!Number.isFinite(n)) return "";

  if (n <= 2) return "td-risk-low";
  if (n === 3) return "td-risk-medium";
  return "td-risk-high";
}

/**
 * Normalize severity for filtering:
 * - "High/Medium/Low" -> Title Case
 * - numeric 1–2 => Low, 3 => Medium, 4–5 => High
 */
function normalizeSeverity(value = "") {
  const v = String(value ?? "").trim().toLowerCase();

  if (v === "high") return "High";
  if (v === "medium") return "Medium";
  if (v === "low") return "Low";

  const n = Number(v);
  if (!Number.isFinite(n)) return String(value ?? "").trim();

  if (n <= 2) return "Low";
  if (n === 3) return "Medium";
  return "High";
}

function closeAllDropdowns() {
  document.querySelectorAll(".filter-dropdown").forEach(d => d.remove());
}

function applyFilters() {
  filteredRows = originalData.rows.filter(row =>
    Object.entries(activeFilters).every(([key, value]) => {
      if (!value) return true;

      if (key === "severity") {
        return normalizeSeverity(row[key]) === value;
      }

      return row[key] === value;
    })
  );

  renderTable();
}

function countWords(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/* ───────── Custom Tooltip ───────── */
const tooltipEl = document.getElementById("tooltip");

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.classList.remove("show");
  tooltipEl.setAttribute("aria-hidden", "true");
}

function showTooltip(anchorEl, text) {
  if (!tooltipEl) return;

  tooltipEl.textContent = text;

  tooltipEl.classList.add("show");
  tooltipEl.setAttribute("aria-hidden", "false");

  const anchorRect = anchorEl.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();
  const pad = 10;

  let left = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - tipRect.width - pad));

  let top = anchorRect.bottom + 10;

  if (top + tipRect.height + pad > window.innerHeight) {
    top = anchorRect.top - tipRect.height - 10;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;

  const centerX = anchorRect.left + anchorRect.width / 2;
  const arrowLeft = Math.max(16, Math.min(centerX - left, tipRect.width - 16));
  tooltipEl.style.setProperty("--arrow-left", `${arrowLeft}px`);
}

/* ───────── Column width logic: ensure header text always fits ───────── */
function applyMinWidthsFromHeaders(tableEl) {
  if (!tableEl) return;

  // measure header label widths using a temporary measuring span
  const thead = tableEl.querySelector("thead");
  if (!thead) return;

  const ths = Array.from(thead.querySelectorAll("th"));
  if (!ths.length) return;

  // Create a hidden measurer that matches header font
  const measurer = document.createElement("span");
  measurer.style.position = "fixed";
  measurer.style.left = "-99999px";
  measurer.style.top = "-99999px";
  measurer.style.whiteSpace = "nowrap";
  measurer.style.fontFamily = getComputedStyle(document.body).fontFamily;
  measurer.style.fontSize = "13px";
  measurer.style.fontWeight = "600";
  document.body.appendChild(measurer);

  // compute min width per column
  const minWidths = ths.map((th, idx) => {
    // label is either inside .th-label or plain text
    const labelEl = th.querySelector(".th-label");
    const labelText = (labelEl ? labelEl.textContent : th.textContent || "").trim();

    measurer.textContent = labelText;

    // padding inside th is 10px left + 10px right.
    // If it has filter icon, add extra space for icon and gap.
    const hasFilter = !!th.querySelector(".filter-icon");
    const basePadding = 20; // left+right padding
    const iconExtra = hasFilter ? 28 : 0; // icon + gap allowance
    const safety = 6;

    const measured = Math.ceil(measurer.getBoundingClientRect().width);
    return measured + basePadding + iconExtra + safety;
  });

  document.body.removeChild(measurer);

  // Apply min-width to header and each cell in that column
  ths.forEach((th, colIndex) => {
    th.style.minWidth = `${minWidths[colIndex]}px`;
  });

  const bodyRows = Array.from(tableEl.querySelectorAll("tbody tr"));
  bodyRows.forEach(tr => {
    const tds = Array.from(tr.children);
    tds.forEach((td, colIndex) => {
      if (minWidths[colIndex] != null) {
        td.style.minWidth = `${minWidths[colIndex]}px`;
      }
    });
  });
}

/* ───────── Render ───────── */
function renderTable() {
  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = "";
  hideTooltip();
  closeAllDropdowns();

  const table = document.createElement("table");

  /* HEADER */
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  originalData.columns.forEach(col => {
    const th = document.createElement("th");

    if (FILTERABLE_COLUMNS[col.key]) {
      const thContent = document.createElement("div");
      thContent.className = "th-content";

      const label = document.createElement("span");
      label.className = "th-label";
      label.textContent = col.label;

      const icon = document.createElement("span");
      icon.className = "filter-icon";
      icon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 6h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M7 12h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M10 18h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

      icon.onclick = e => {
        e.stopPropagation();
        closeAllDropdowns();

        const dropdown = document.createElement("div");
        dropdown.className = "filter-dropdown";

        const all = document.createElement("div");
        all.className = "filter-option";
        all.textContent = "All";
        all.onclick = () => {
          activeFilters[col.key] = "";
          closeAllDropdowns();
          applyFilters();
        };
        dropdown.appendChild(all);

        if (col.key === "severity") {
          const values = [
            ...new Set(originalData.rows.map(r => normalizeSeverity(r[col.key])))
          ].filter(Boolean);

          const ordered = ["High", "Medium", "Low"].filter(v => values.includes(v));
          const rest = values.filter(v => !ordered.includes(v));

          [...ordered, ...rest].forEach(value => {
            const opt = document.createElement("div");
            opt.className = "filter-option";
            opt.textContent = value;

            if (activeFilters[col.key] === value) opt.classList.add("active");

            opt.onclick = () => {
              activeFilters[col.key] = value;
              closeAllDropdowns();
              applyFilters();
            };

            dropdown.appendChild(opt);
          });
        } else {
          getUniqueValues(originalData.rows, col.key).forEach(value => {
            const opt = document.createElement("div");
            opt.className = "filter-option";
            opt.textContent = value;

            if (activeFilters[col.key] === value) opt.classList.add("active");

            opt.onclick = () => {
              activeFilters[col.key] = value;
              closeAllDropdowns();
              applyFilters();
            };

            dropdown.appendChild(opt);
          });
        }

        document.body.appendChild(dropdown);

        const rect = icon.getBoundingClientRect();
        const gap = 8;
        const ddRect = dropdown.getBoundingClientRect();

        const left = Math.min(rect.left, window.innerWidth - ddRect.width - 10);
        const top = Math.min(rect.bottom + gap, window.innerHeight - ddRect.height - 10);

        dropdown.style.left = `${Math.max(10, left)}px`;
        dropdown.style.top = `${Math.max(10, top)}px`;
      };

      thContent.appendChild(label);
      thContent.appendChild(icon);
      th.appendChild(thContent);
    } else {
      th.textContent = col.label;
    }

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  /* BODY */
  const tbody = document.createElement("tbody");

  filteredRows.forEach(row => {
    const tr = document.createElement("tr");

    originalData.columns.forEach(col => {
      const td = document.createElement("td");
      const value = row[col.key] ?? "";

      if (col.key === "severity") {
        td.textContent = String(value);
        td.className = getRiskClass(value);
      } else if (col.key === "likelihood") {
        td.textContent = String(value);
      } else {
        const text = String(value);

        if (countWords(text) > 6) {
          td.textContent = text;
          td.classList.add("td-truncate");

          td.addEventListener("mouseenter", () => showTooltip(td, text));
          td.addEventListener("mouseleave", hideTooltip);
          td.addEventListener("mousemove", () => showTooltip(td, text));
        } else {
          td.textContent = text;
        }
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  root.appendChild(table);

  // ✅ ensure column width fits header text at minimum
  applyMinWidthsFromHeaders(table);
}

/* ───────── Init ───────── */
document.addEventListener("DOMContentLoaded", () => {
  renderTable();
});

document.addEventListener("click", () => {
  closeAllDropdowns();
  hideTooltip();
});

window.addEventListener("scroll", hideTooltip, true);
window.addEventListener("resize", () => {
  hideTooltip();
  // re-render to recompute min widths in case fonts/layout changed
  renderTable();
});

/* ───────── Agent Payload ───────── */
window.addEventListener("message", event => {
  const data = event.data;
  if (
    data?.type === "ui_component_render" &&
    data?.source === "agentos" &&
    data?.payload?.columns &&
    data?.payload?.rows
  ) {
    originalData = data.payload;
    filteredRows = data.payload.rows;
    activeFilters = {};
    renderTable();
  }
});
