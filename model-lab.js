(() => {
  "use strict";

  if (!window.ModelLogistik) {
    console.error("model-lab.js harus dimuat setelah model.js dan app.js.");
    return;
  }

  const base = {
    validasiParameter: window.ModelLogistik.validasiParameter,
    populasiLogistik: window.ModelLogistik.populasiLogistik,
    buatDataPopulasi: window.ModelLogistik.buatDataPopulasi,
  };

  const MODELS = {
    exponential: {
      name: "Exponential Growth",
      description: "Pertumbuhan tanpa carrying capacity.",
      formula: String.raw`\frac{dP}{dt}=rP`,
      solution: String.raw`P(t)=P_0e^{rt}`,
    },
    logistic: {
      name: "Logistic Growth",
      description: "Pertumbuhan dengan carrying capacity K.",
      formula: String.raw`\frac{dP}{dt}=rP\left(1-\frac{P}{K}\right)`,
      solution: String.raw`P(t)=\frac{K}{1+\left(\frac{K-P_0}{P_0}\right)e^{-rt}}`,
    },
    harvesting: {
      name: "Logistic + Harvesting",
      description: "Model logistik dengan pengurangan populasi konstan H.",
      formula: String.raw`\frac{dP}{dt}=rP\left(1-\frac{P}{K}\right)-H`,
      solution: "Simulasi numerik RK4",
    },
    predatorPrey: {
      name: "Predator–Prey",
      description: "Model dua populasi Lotka–Volterra. Grafik utama menampilkan prey.",
      formula: String.raw`\frac{dP}{dt}=\alpha P-\beta PQ,\quad \frac{dQ}{dt}=\gamma PQ-\delta Q`,
      solution: "Simulasi numerik RK4",
    },
  };

  const THEMES = {
    forest: "🌲 Forest",
    pond: "🌊 Pond",
    lab: "🧫 Microbiology Lab",
    garden: "🌼 Garden",
    wildlife: "🦁 Wildlife Reserve",
  };

  const state = {
    model: "logistic",
    theme: "forest",
  };

  function num(id, fallback) {
    const el = document.getElementById(id);
    const value = Number(el?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function rk4Scalar(y, t, h, f) {
    const k1 = f(t, y);
    const k2 = f(t + h / 2, y + h * k1 / 2);
    const k3 = f(t + h / 2, y + h * k2 / 2);
    const k4 = f(t + h, y + h * k3);
    return y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  }

  function rk4Pair(P, Q, t, h, f) {
    const k1 = f(t, P, Q);
    const k2 = f(t + h / 2, P + h * k1.dP / 2, Q + h * k1.dQ / 2);
    const k3 = f(t + h / 2, P + h * k2.dP / 2, Q + h * k2.dQ / 2);
    const k4 = f(t + h, P + h * k3.dP, Q + h * k3.dQ);

    return {
      P: P + (h / 6) * (k1.dP + 2 * k2.dP + 2 * k3.dP + k4.dP),
      Q: Q + (h / 6) * (k1.dQ + 2 * k2.dQ + 2 * k3.dQ + k4.dQ),
    };
  }

  function extra() {
    return {
      H: num("mlH", 50),
      Q0: num("mlQ0", 9),
      alpha: num("mlAlpha", 0.6),
      beta: num("mlBeta", 0.025),
      gamma: num("mlGamma", 0.015),
      delta: num("mlDelta", 0.5),
    };
  }

  function valueAt(t, parameter, model = state.model) {
    const p = base.validasiParameter(parameter);

    if (model === "exponential") {
      return p.P0 * Math.exp(p.r * t);
    }

    if (model === "logistic") {
      return base.populasiLogistik(t, p.P0, p.r, p.K);
    }

    if (model === "harvesting") {
      const { H } = extra();
      const steps = Math.max(40, Math.ceil(t * 20));
      const h = t / steps || 0;
      let P = p.P0;
      let time = 0;
      const f = (_time, y) => p.r * y * (1 - y / p.K) - H;

      for (let i = 0; i < steps; i++) {
        P = Math.max(0, rk4Scalar(P, time, h, f));
        time += h;
      }
      return P;
    }

    if (model === "predatorPrey") {
      return predatorAt(t, p).P;
    }

    return base.populasiLogistik(t, p.P0, p.r, p.K);
  }

  function predatorAt(t, parameter) {
    const p = base.validasiParameter(parameter);
    const { Q0, alpha, beta, gamma, delta } = extra();

    const steps = Math.max(40, Math.ceil(t * 20));
    const h = t / steps || 0;
    let P = p.P0;
    let Q = Q0;
    let time = 0;

    const f = (_time, prey, predator) => ({
      dP: alpha * prey - beta * prey * predator,
      dQ: gamma * prey * predator - delta * predator,
    });

    for (let i = 0; i < steps; i++) {
      const next = rk4Pair(P, Q, time, h, f);
      P = Math.max(0, next.P);
      Q = Math.max(0, next.Q);
      time += h;
    }

    return { P, Q };
  }

  function simulateSeries(parameter, model = state.model, jumlahTitik = 240) {
    const p = base.validasiParameter(parameter);
    const n = Math.max(20, Math.min(1000, Math.floor(jumlahTitik)));

    if (model !== "predatorPrey") {
      const data = [];
      for (let i = 0; i <= n; i++) {
        const t = (p.T * i) / n;
        data.push({ x: t, y: valueAt(t, p, model) });
      }
      return [{ label: "Populasi", data }];
    }

    const { Q0, alpha, beta, gamma, delta } = extra();
    const h = p.T / n;
    let P = p.P0;
    let Q = Q0;
    let t = 0;

    const prey = [{ x: 0, y: P }];
    const predator = [{ x: 0, y: Q }];

    const f = (_time, preyValue, predatorValue) => ({
      dP: alpha * preyValue - beta * preyValue * predatorValue,
      dQ: gamma * preyValue * predatorValue - delta * predatorValue,
    });

    for (let i = 1; i <= n; i++) {
      const next = rk4Pair(P, Q, t, h, f);
      P = Math.max(0, next.P);
      Q = Math.max(0, next.Q);
      t = i * h;
      prey.push({ x: t, y: P });
      predator.push({ x: t, y: Q });
    }

    return [
      { label: "Prey", data: prey },
      { label: "Predator", data: predator },
    ];
  }

  /* Override hanya API global. app.js asli tidak dihapus/diubah. */
  window.ModelLogistik.validasiParameter = function(parameter) {
    return base.validasiParameter(parameter);
  };

  window.ModelLogistik.populasiLogistik = function(t, P0, r, K) {
    return valueAt(t, { P0, r, K, T: Math.max(Number(t), 0.0001) }, state.model);
  };

  window.ModelLogistik.buatDataPopulasi = function(parameter, jumlahTitik = 240) {
    return simulateSeries(parameter, state.model, jumlahTitik)[0].data;
  };

  function injectStyle() {
    const style = document.createElement("style");
    style.textContent = `
      .model-lab-panel{border:1px solid var(--garis,#cfdcd8);background:var(--panel,#fff);border-radius:10px;padding:16px;margin-bottom:16px}
      .model-lab-panel h2{margin:0 0 4px;font-size:16px}.model-lab-sub{margin:0 0 13px;color:var(--muted,#5b6f6a);font-size:13px}
      .ml-group-title{margin:12px 0 7px;font-size:12px;font-weight:700;color:var(--muted,#5b6f6a)}
      .ml-radio{display:flex;gap:8px;align-items:center;margin:7px 0;font-size:13px}.ml-radio input{accent-color:var(--hijau,#1f7a63)}
      .ml-summary{margin-top:12px;padding:10px;border-radius:8px;background:#f2f5f3;font-size:12px}.ml-summary strong{display:block;margin-bottom:2px}
      .ml-extra{margin-top:12px;padding-top:10px;border-top:1px solid var(--garis,#cfdcd8)}
      .ml-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ml-extra label{font-size:12px;color:var(--muted,#5b6f6a)}.ml-extra input{width:100%;margin-top:3px}
      .ml-note{margin:8px 0 0;color:var(--muted,#5b6f6a);font-size:11px}
      .ml-hidden{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    const left = document.querySelector(".kolom-kiri");
    if (!left || document.getElementById("modelLabPanel")) return;

    const panel = document.createElement("section");
    panel.id = "modelLabPanel";
    panel.className = "model-lab-panel";
    panel.innerHTML = `
      <h2>🧪 Choose Your Model</h2>
      <p class="model-lab-sub">Select the mathematical model that fits your ecosystem.</p>

      <div class="ml-group-title">Population model</div>
      ${Object.entries(MODELS).map(([id, m]) => `
        <label class="ml-radio">
          <input type="radio" name="mlModel" value="${id}" ${id === state.model ? "checked" : ""}>
          <span>${m.name}</span>
        </label>
      `).join("")}

      <div class="ml-group-title">Ecosystem theme</div>
      ${Object.entries(THEMES).map(([id, name]) => `
        <label class="ml-radio">
          <input type="radio" name="mlTheme" value="${id}" ${id === state.theme ? "checked" : ""}>
          <span>${name}</span>
        </label>
      `).join("")}

      <div id="mlExtra" class="ml-extra"></div>

      <div class="ml-summary">
        <span>SELECTED CONFIGURATION</span>
        <strong id="mlSummaryModel">Logistic Growth</strong>
        <span id="mlSummaryTheme">Theme: Forest</span>
        <p id="mlSummaryDesc" class="ml-note">Pertumbuhan dengan carrying capacity K.</p>
      </div>
    `;

    left.insertBefore(panel, left.firstElementChild);

    panel.querySelectorAll('input[name="mlModel"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        state.model = radio.value;
        renderExtra();
        applyModelUI();
        refreshApp();
      });
    });

    panel.querySelectorAll('input[name="mlTheme"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        state.theme = radio.value;
        updateSummary();
        window.dispatchEvent(new CustomEvent("modellab:themechange", {
          detail: { theme: state.theme },
        }));
      });
    });
  }

  function extraField(id, label, value, step) {
    return `<label>${label}<input type="number" id="${id}" value="${value}" step="${step}"></label>`;
  }

  function renderExtra() {
    const box = document.getElementById("mlExtra");
    if (!box) return;

    if (state.model === "harvesting") {
      box.innerHTML = `
        <div class="ml-group-title">Additional parameter</div>
        <div class="ml-extra-grid">
          ${extraField("mlH", "Harvesting rate (H)", 50, 1)}
        </div>
      `;
    } else if (state.model === "predatorPrey") {
      box.innerHTML = `
        <div class="ml-group-title">Predator–Prey parameters</div>
        <div class="ml-extra-grid">
          ${extraField("mlQ0", "Predator awal (Q₀)", 9, 1)}
          ${extraField("mlAlpha", "α", 0.6, 0.01)}
          ${extraField("mlBeta", "β", 0.025, 0.001)}
          ${extraField("mlGamma", "γ", 0.015, 0.001)}
          ${extraField("mlDelta", "δ", 0.5, 0.01)}
        </div>
        <p class="ml-note">Grafik utama update-jer menampilkan prey. Tiny World juga memakai prey sebagai satu populasi.</p>
      `;
    } else {
      box.innerHTML = "";
    }

    box.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", refreshApp);
    });
  }

  function setFormula() {
    const model = MODELS[state.model];
    const formula = document.getElementById("rumusModel");
    const solution = document.getElementById("rumusAnalitik");

    if (!formula || !solution) return;

    if (window.katex && model.formula.startsWith("\\")) {
      try {
        katex.render(model.formula, formula, { throwOnError: false });
      } catch {
        formula.textContent = model.formula;
      }
    } else {
      formula.textContent = model.formula;
    }

    if (window.katex && model.solution.startsWith("\\")) {
      try {
        katex.render(model.solution, solution, { throwOnError: false });
      } catch {
        solution.textContent = model.solution;
      }
    } else {
      solution.textContent = model.solution;
    }
  }

  function applyModelUI() {
    const k = document.getElementById("K");
    const r = document.getElementById("r");
    const kWrap = k?.closest(".field-slider") || k?.closest(".field");
    const rWrap = r?.closest(".field-slider") || r?.closest(".field");

    kWrap?.classList.toggle("ml-hidden",
      state.model === "exponential" || state.model === "predatorPrey"
    );

    rWrap?.classList.toggle("ml-hidden", state.model === "predatorPrey");

    const optButton = document.getElementById("btnOpt");
    if (optButton) {
      optButton.disabled = state.model === "predatorPrey";
      optButton.title = state.model === "predatorPrey"
        ? "Predator–Prey tidak memakai parameter r yang sama."
        : "";
    }

    setFormula();
    updateSummary();
  }

  function updateSummary() {
    const m = MODELS[state.model];
    const themeText = THEMES[state.theme];

    const modelEl = document.getElementById("mlSummaryModel");
    const themeEl = document.getElementById("mlSummaryTheme");
    const descEl = document.getElementById("mlSummaryDesc");

    if (modelEl) modelEl.textContent = m.name;
    if (themeEl) themeEl.textContent = `Theme: ${themeText.replace(/^.\s*/, "")}`;
    if (descEl) descEl.textContent = m.description;
  }

  function adjustChart() {
    const canvas = document.getElementById("chart");
    const c = canvas && window.Chart?.getChart ? Chart.getChart(canvas) : null;
    if (!c) return;

    const m = MODELS[state.model];

    if (c.data.datasets[0]) {
      c.data.datasets[0].label = `${m.name} · Model Utama`;
    }

    if (state.model === "exponential" || state.model === "predatorPrey") {
      c.data.datasets = c.data.datasets.filter(
        (d) => !String(d.label || "").startsWith("K Utama")
      );
      if (c.options?.scales?.y) delete c.options.scales.y.max;
    }

    c.update("none");
  }

  function refreshApp() {
    const p0 = document.getElementById("P0");
    if (p0) {
      p0.dispatchEvent(new Event("input", { bubbles: true }));
      setTimeout(adjustChart, 0);
    }
  }

  /* API untuk add-on Tiny World. */
  window.ModelLab = {
    getModel: () => state.model,
    getTheme: () => state.theme,
    getDefinition: () => MODELS[state.model],
    simulateSeries(parameter, jumlahTitik = 120) {
      return simulateSeries(parameter, state.model, jumlahTitik);
    },
    getCurrentParameter() {
      return {
        P0: num("P0", 50),
        r: num("r", 0.4),
        K: num("K", 1000),
        T: num("T", 30),
      };
    },
  };

  injectStyle();
  createPanel();
  renderExtra();
  applyModelUI();

  ["P0", "r", "K", "T"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      setTimeout(adjustChart, 0);
    });
  });

  refreshApp();
})();
