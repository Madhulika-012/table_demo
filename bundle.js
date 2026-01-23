/* ───────── Fallback ───────── */
const fallback = {
  columns: [{ key: "status", label: "Status" }],
  rows: [{ status: "UI loaded correctly" }]
};

let originalData = fallback;
let filteredRows = fallback.rows;
let activeFilters = {};

/* Columns with dropdown filters */
const FILTERABLE_COLUMNS = {
  risk_type: true,
  responsible_department: true
};

/* ───────── Helpers ───────── */
function getUniqueValues(rows, key) {
  return [...new Set(rows.map(r => r[key]).filter(Boolean))];
}

function getRiskClass(text = "") {
  const match = String(text).match(/\b([1-5])\b/);
  if (!match) return "";
  const score = Number(match[1]);
  if (score <= 2) return "td-risk-low";
  if (score === 3) return "td-risk-medium";
  return "td-risk-high";
}

function closeAllDropdowns() {
  document.querySelectorAll(".filter-dropdown").forEach(d => d.remove());
}

function applyFilters() {
  filteredRows = originalData.rows.filter(row =>
    Object.entries(activeFilters).every(
      ([key, value]) => !value || row[key] === value
    )
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

  // Make visible so we can measure size
  tooltipEl.classList.add("show");
  tooltipEl.setAttribute("aria-hidden", "false");

  const anchorRect = anchorEl.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();
  const pad = 10;

  // Center tooltip under the text like screenshot
  let left = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - tipRect.width - pad));

  let top = anchorRect.bottom + 10;

  // If would overflow bottom, flip above
  if (top + tipRect.height + pad > window.innerHeight) {
    top = anchorRect.top - tipRect.height - 10;

    // move arrow to bottom if flipped
    tooltipEl.style.setProperty("--arrow-top", "auto");
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;

  // Position arrow to visually point near cell center (clamped)
  const centerX = anchorRect.left + anchorRect.width / 2;
  const arrowLeft = Math.max(
    16,
    Math.min(centerX - left, tipRect.width - 16)
  );
  tooltipEl.style.setProperty("--arrow-left", `${arrowLeft}px`);
}

/* Use CSS variables to place arrow precisely */
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

        // "Filter by ..." line removed: we do NOT add a header div

        const all = document.createElement("div");
        all.className = "filter-option";
        all.textContent = "All";
        all.onclick = () => {
          activeFilters[col.key] = "";
          closeAllDropdowns();
          applyFilters();
        };
        dropdown.appendChild(all);

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

        document.body.appendChild(dropdown);

        // Position dropdown near icon
        const rect = icon.getBoundingClientRect();
        const gap = 8;

        // Temporarily force layout for accurate width
        const ddRect = dropdown.getBoundingClientRect();

        const left = Math.min(
          rect.left,
          window.innerWidth - ddRect.width - 10
        );
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

      if (col.key === "severity" || col.key === "likelihood") {
        td.textContent = String(value);
        td.className = getRiskClass(value);
      } else {
        const text = String(value);

        // Truncate if > 6 words, and use custom tooltip like screenshot
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
