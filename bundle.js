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

/* Word count helper for tooltip/ellipsis rule */
function countWords(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/* ───────── Render ───────── */
function renderTable() {
  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = "";

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

        const header = document.createElement("div");
        header.className = "filter-dropdown-header";
        header.textContent = `Filter by ${col.label}`;
        dropdown.appendChild(header);

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

        // Attach dropdown to body so it can float above sticky header/table container
        document.body.appendChild(dropdown);

        // Position dropdown under the filter icon
        const rect = icon.getBoundingClientRect();
        const gap = 6;

        dropdown.style.left = `${Math.min(
          rect.left,
          window.innerWidth - dropdown.offsetWidth - 8
        )}px`;
        dropdown.style.top = `${Math.min(
          rect.bottom + gap,
          window.innerHeight - dropdown.offsetHeight - 8
        )}px`;
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

      // Severity / Likelihood with risk coloring
      if (col.key === "severity" || col.key === "likelihood") {
        td.textContent = String(value);
        td.className = getRiskClass(value);
      } else {
        const text = String(value);

        // If text has more than 6 words, truncate with CSS and add tooltip
        if (countWords(text) > 6) {
          td.textContent = text;
          td.classList.add("td-truncate"); // relies on CSS .td-truncate
          td.title = text;                 // native tooltip
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
  // Render fallback until real payload arrives
  renderTable();
});

document.addEventListener("click", closeAllDropdowns);

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
