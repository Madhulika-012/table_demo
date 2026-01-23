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
 * Normalize severity value for filtering so that:
 * - "High"/"high" => "High"
 * - "Medium"/"medium" => "Medium"
 * - "Low"/"low" => "Low"
 * - numeric 1–2 => "Low", 3 => "Medium", 4–5 => "High"
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

      // Special case: severity filter should compare normalized label
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

  // show for measurement
  tooltipEl.classList.add("show");
  tooltipEl.setAttribute("aria-hidden", "false");

  const anchorRect = anchorEl.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();
  const pad = 10;

  // Center tooltip horizontally relative to cell
  let left = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - tipRect.width - pad));

  // Prefer below the cell
  let top = anchorRect.bottom + 10;

  // Flip above if needed
  if (top + tipRect.height + pad > window.innerHeight) {
    top = anchorRect.top - tipRect.height - 10;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;

  // Arrow points to center of cell (clamped within tooltip)
  const centerX = anchorRect.left + anchorRect.width / 2;
  const arrowLeft = Math.max(16, Math.min(centerX - left, tipRect.width - 16));
  tooltipEl.style.setProperty("--arrow-left", `${arrowLeft}px`);
}

/* Ensure tooltip arrow uses the CSS variable */
(function injectArrowPositionCSS() {
  const style = document.createElement("style");
  style.textContent = `
    .custom-tooltip::after{
      left: var(--arrow-left, 50%) !important;
      transform: translateX(-50%);
    }
  `;
  document.head.appendChild(style);
})();

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
      const label = document.createElement("span");
      label.textContent = col.label;

      const icon = document.createElement("span");
      icon.textContent = "▾";
      icon.className = "filter-icon";

      icon.onclick = e => {
        e.stopPropagation();
        closeAllDropdowns();

        const dropdown = document.createElement("div");
        dropdown.className = "filter-dropdown";

        // "Filter by ..." line removed

        const all = document.createElement("div");
        all.className = "filter-option";
        all.textContent = "All";
        all.onclick = () => {
          activeFilters[col.key] = "";
          closeAllDropdowns();
          applyFilters();
        };
        dropdown.appendChild(all);

        // For severity: show High/Medium/Low unique values (normalized)
        if (col.key === "severity") {
          const values = [...new Set(originalData.rows.map(r => normalizeSeverity(r[col.key])))]
            .filter(Boolean);

          // Keep a nice order if present
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

            if (activeFilters[col.key] === value) {
              opt.classList.add("active");
            }

            opt.onclick = () => {
              activeFilters[col.key] = value;
              closeAllDropdowns();
              applyFilters();
            };

            dropdown.appendChild(opt);
          });
        }

        document.body.appendChild(dropdown);

        // Position dropdown near icon
        const rect = icon.getBoundingClientRect();
        const gap = 8;
        const ddRect = dropdown.getBoundingClientRect();

        const left = Math.min(rect.left, window.innerWidth - ddRect.width - 10);
        const top = Math.min(
          rect.bottom + gap,
          window.innerHeight - ddRect.height - 10
        );

        dropdown.style.left = `${Math.max(10, left)}px`;
        dropdown.style.top = `${Math.max(10, top)}px`;
      };

      th.appendChild(label);
      th.appendChild(icon);
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

      // ✅ Severity colored as High/Medium/Low
      if (col.key === "severity") {
        td.textContent = String(value);
        td.className = getRiskClass(value);
      }
      // Likelihood stays plain
      else if (col.key === "likelihood") {
        td.textContent = String(value);
      } else {
        const text = String(value);

        // Truncate if > 6 words, show custom tooltip
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
window.addEventListener("resize", hideTooltip);

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
