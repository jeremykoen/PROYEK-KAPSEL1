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
      description: "Model dua populasi Lotka–Volterra. Tiny World menampilkan prey sebagai populasi utama.",
      formula: String.raw`\frac{dP}{dt}=\alpha P-\beta PQ,\quad \frac{dQ}{dt}=\gamma PQ-\delta Q`,
      solution: "Simulasi numerik RK4",
    },
  };

  const THEMES = {
    forest: {
      label: "🌲 Forest",
      desc: "Hutan hijau",
      emojis: ["🐇", "🦌", "🦔", "🦋", "🌲", "🍄"],
      deco: "🌲 🌳 🌿 ☁️",
      pageBg: "linear-gradient(180deg,#edf8f3 0%,#f7fbf9 60%,#eef7f2 100%)",
    },
    pond: {
      label: "🌊 Pond",
      desc: "Kolam air",
      emojis: ["🐟", "🐸", "🦆", "🦐", "🪷", "🐚"],
      deco: "☁️ 🌊 🪷 💧",
      pageBg: "linear-gradient(180deg,#eefaff 0%,#f9fdff 60%,#eef9ff 100%)",
    },
    lab: {
      label: "🧫 Microbiology Lab",
      desc: "Laboratorium mikrobiologi",
      emojis: ["🦠", "🧫", "🧬", "🫧", "🔬", "🧪"],
      deco: "🧫 🔬 ✨ 🫧",
      pageBg: "linear-gradient(180deg,#f2f4ff 0%,#fbfbff 60%,#f2f4ff 100%)",
    },
    garden: {
      label: "🌼 Garden",
      desc: "Taman bunga",
      emojis: ["🌼", "🌷", "🐝", "🦋", "🐞", "🌱"],
      deco: "🌼 🌷 🌿 ☀️",
      pageBg: "linear-gradient(180deg,#fff9ec 0%,#fffdf8 60%,#fff6e9 100%)",
    },
    wildlife: {
      label: "🦁 Wildlife Reserve",
      desc: "Cagar alam",
      emojis: ["🦁", "🦓", "🐘", "🦒", "🦬", "🐒"],
      deco: "🌴 ☀️ 🪨 🌿",
      pageBg: "linear-gradient(180deg,#fff5e3 0%,#fffaf1 60%,#fff0d5 100%)",
    },
  };

  const state = {
    model: "logistic",
    theme: "forest",
    targetStatus: {
      type: "idle",
      badge: "✨ Ready",
      title: "Atur parameter dulu",
      text: "Tiny World akan bereaksi otomatis sesuai hasil modelmu.",
      current: null,
      target: null,
      errorRatio: null,
    },
  };

  function num(id, fallback) {
    const el = document.getElementById(id);
    const value = Number(el?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function rk4Scalar(y, t, h, f) {
    const k1 = f(t, y);
    const k2 = f(t + h / 2, y + (h * k1) / 2);
    const k3 = f(t + h / 2, y + (h * k2) / 2);
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

  // App lama tetap dipakai; fungsi global ini hanya diarahkan ke model terpilih.
  window.ModelLogistik.validasiParameter = (parameter) => base.validasiParameter(parameter);
  window.ModelLogistik.populasiLogistik = (t, P0, r, K) =>
    valueAt(t, { P0, r, K, T: Math.max(Number(t), 0.0001) }, state.model);
  window.ModelLogistik.buatDataPopulasi = (parameter, jumlahTitik = 240) =>
    simulateSeries(parameter, state.model, jumlahTitik)[0].data;

  function injectStyle() {
    const style = document.createElement("style");
    style.textContent = `
      body{transition:background .35s ease}
      .model-lab-panel{border:1px solid var(--garis,#cfdcd8);background:rgba(255,255,255,.93);border-radius:14px;padding:16px;margin-bottom:16px;box-shadow:0 10px 28px rgba(24,60,46,.06)}
      .model-lab-panel h2{margin:0 0 4px;font-size:18px}.model-lab-sub{margin:0 0 13px;color:var(--muted,#5b6f6a);font-size:13px}
      .ml-group-title{margin:12px 0 7px;font-size:12px;font-weight:700;color:var(--muted,#5b6f6a);text-transform:uppercase;letter-spacing:.05em}
      .ml-radio{display:flex;gap:8px;align-items:center;margin:7px 0;font-size:13px}.ml-radio input{accent-color:var(--hijau,#1f7a63)}
      .ml-summary,.ml-reaction{margin-top:12px;padding:11px;border-radius:11px;border:1px solid #e1ece8;background:#f6faf8;font-size:12px}.ml-summary strong{display:block;margin-bottom:2px;font-size:14px}
      .ml-extra{margin-top:12px;padding-top:10px;border-top:1px solid var(--garis,#cfdcd8)}.ml-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ml-extra label{font-size:12px;color:var(--muted,#5b6f6a)}.ml-extra input{width:100%;margin-top:3px}
      .ml-note{margin:7px 0 0;color:var(--muted,#5b6f6a);font-size:11px;line-height:1.45}.ml-hidden{display:none!important}
      .ml-reaction-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ml-reaction-badge{display:inline-flex;padding:6px 9px;border-radius:999px;font-weight:800}.ml-reaction-badge.idle{background:#edf3f1;color:#31564b}.ml-reaction-badge.low{background:#e7f1ff;color:#245a9f}.ml-reaction-badge.close{background:#fff1c9;color:#8d6300}.ml-reaction-badge.optimal{background:#ddf8e7;color:#0f6a35}.ml-reaction-badge.high{background:#ffe3e3;color:#a11c1c}.ml-reaction-badge.info{background:#efeaff;color:#5b42a7}
      .ml-reaction strong{font-size:13px}.ml-reaction p{margin:7px 0 0;color:#5b6f6a;line-height:1.45}
      @media(max-width:760px){.ml-extra-grid{grid-template-columns:1fr}}
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
      <p class="model-lab-sub">Pilih model dan ecosystem. Parameter tetap diatur dari panel utama di bawah.</p>

      <div class="ml-group-title">Population model</div>
      ${Object.entries(MODELS).map(([id, m]) => `
        <label class="ml-radio">
          <input type="radio" name="mlModel" value="${id}" ${id === state.model ? "checked" : ""}>
          <span>${m.name}</span>
        </label>
      `).join("")}

      <div class="ml-group-title">Ecosystem theme</div>
      ${Object.entries(THEMES).map(([id, item]) => `
        <label class="ml-radio">
          <input type="radio" name="mlTheme" value="${id}" ${id === state.theme ? "checked" : ""}>
          <span>${item.label}</span>
        </label>
      `).join("")}

      <div id="mlExtra" class="ml-extra"></div>

      <div class="ml-summary">
        <span class="ml-group-title" style="margin:0 0 5px">Selected configuration</span>
        <strong id="mlSummaryModel">Logistic Growth</strong>
        <span id="mlSummaryTheme">Theme: Forest</span>
        <p id="mlSummaryDesc" class="ml-note"></p>
      </div>

      <div id="mlReaction" class="ml-reaction">
        <div class="ml-reaction-head">
          <span id="mlReactionBadge" class="ml-reaction-badge idle">✨ Ready</span>
          <strong id="mlReactionTitle">Atur parameter dulu</strong>
        </div>
        <p id="mlReactionText">Tiny World akan bereaksi otomatis sesuai hasil parameter dan target optimasi.</p>
      </div>
    `;

    left.insertBefore(panel, left.firstElementChild);

    panel.querySelectorAll('input[name="mlModel"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        state.model = radio.value;
        renderExtra();
        applyModelUI();
        refreshApp();
        refreshTargetStatus();
        dispatch("modellab:modelchange", { model: state.model });
      });
    });

    panel.querySelectorAll('input[name="mlTheme"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        state.theme = radio.value;
        applyTheme();
        updateSummary();
        dispatch("modellab:themechange", { theme: state.theme });
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
        <div class="ml-extra-grid">${extraField("mlH", "Harvesting rate (H)", 50, 1)}</div>
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
        <p class="ml-note">Untuk model ini, Tiny World menampilkan prey sebagai satu populasi visual.</p>
      `;
    } else {
      box.innerHTML = "";
    }

    box.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        refreshApp();
        refreshTargetStatus();
        dispatch("modellab:parameterchange", {});
      });
    });
  }

  function setFormula() {
    const model = MODELS[state.model];
    const formula = document.getElementById("rumusModel");
    const solution = document.getElementById("rumusAnalitik");
    if (!formula || !solution) return;

    try {
      if (window.katex && model.formula.startsWith("\\")) katex.render(model.formula, formula, { throwOnError: false });
      else formula.textContent = model.formula;
    } catch { formula.textContent = model.formula; }

    try {
      if (window.katex && model.solution.startsWith("\\")) katex.render(model.solution, solution, { throwOnError: false });
      else solution.textContent = model.solution;
    } catch { solution.textContent = model.solution; }
  }

  function applyTheme() {
    document.body.style.background = THEMES[state.theme].pageBg;
  }

  function applyModelUI() {
    const k = document.getElementById("K");
    const r = document.getElementById("r");
    const kWrap = k?.closest(".field-slider") || k?.closest(".field");
    const rWrap = r?.closest(".field-slider") || r?.closest(".field");

    kWrap?.classList.toggle("ml-hidden", state.model === "exponential" || state.model === "predatorPrey");
    rWrap?.classList.toggle("ml-hidden", state.model === "predatorPrey");

    const optButton = document.getElementById("btnOpt");
    if (optButton) {
      optButton.disabled = state.model === "predatorPrey";
      optButton.title = state.model === "predatorPrey" ? "Predator–Prey tidak memakai r tunggal." : "";
    }

    setFormula();
    updateSummary();
  }

  function updateSummary() {
    const model = MODELS[state.model];
    const theme = THEMES[state.theme];
    const modelEl = document.getElementById("mlSummaryModel");
    const themeEl = document.getElementById("mlSummaryTheme");
    const descEl = document.getElementById("mlSummaryDesc");

    if (modelEl) modelEl.textContent = model.name;
    if (themeEl) themeEl.textContent = `Theme: ${theme.label.replace(/^.\s*/, "")}`;
    if (descEl) descEl.textContent = `${model.description} · ${theme.desc}`;
  }

  function setTargetStatus(type, badge, title, text, current = null, target = null, errorRatio = null) {
    state.targetStatus = { type, badge, title, text, current, target, errorRatio };
    const badgeEl = document.getElementById("mlReactionBadge");
    const titleEl = document.getElementById("mlReactionTitle");
    const textEl = document.getElementById("mlReactionText");
    if (badgeEl) {
      badgeEl.className = `ml-reaction-badge ${type}`;
      badgeEl.textContent = badge;
    }
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    dispatch("modellab:statuschange", { ...state.targetStatus });
  }

  function getCurrentParameter() {
    return {
      P0: num("P0", 50),
      r: num("r", 0.4),
      K: num("K", 1000),
      T: num("T", 30),
    };
  }

  function refreshTargetStatus() {
    if (state.model === "predatorPrey") {
      setTargetStatus("info", "🧪 Dynamic", "Predator–Prey aktif", "Model ini punya dua populasi, jadi tidak ada satu nilai r optimal seperti model lainnya.");
      return;
    }

    const pTarget = num("pTarget", NaN);
    const tTarget = num("tTarget", NaN);
    if (!Number.isFinite(pTarget) || !Number.isFinite(tTarget) || pTarget <= 0 || tTarget <= 0) {
      setTargetStatus("idle", "✨ Ready", "Atur parameter dulu", "Isi target optimasi lalu ubah parameter. Reaksi akan berubah otomatis.");
      return;
    }

    try {
      const currentParam = getCurrentParameter();
      const current = valueAt(tTarget, currentParam, state.model);
      const errorRatio = Math.abs(current - pTarget) / Math.max(1, pTarget);

      if (errorRatio <= 0.025) {
        setTargetStatus(
          "optimal",
          "🎉 Yay!",
          "Segini pas!",
          `Parameter kamu sudah menghasilkan populasi sekitar ${Math.round(current)} pada t=${tTarget}, sangat dekat dengan target ${Math.round(pTarget)}.`,
          current,
          pTarget,
          errorRatio,
        );
      } else if (errorRatio <= 0.1) {
        setTargetStatus(
          "close",
          "👀 Dikit lagi!",
          "Hampir optimal",
          `Hasilnya sekitar ${Math.round(current)}. Targetnya ${Math.round(pTarget)}, jadi tinggal tuning sedikit lagi.`,
          current,
          pTarget,
          errorRatio,
        );
      } else if (current < pTarget) {
        setTargetStatus(
          "low",
          "🌱 Ayo tambah lagi!",
          "Masih terlalu sedikit",
          `Hasilnya baru sekitar ${Math.round(current)} dari target ${Math.round(pTarget)}. Coba naikkan growth rate, populasi awal, atau waktu.`,
          current,
          pTarget,
          errorRatio,
        );
      } else {
        setTargetStatus(
          "high",
          "😵 Keramean!",
          "Populasinya kebanyakan",
          `Hasilnya sekitar ${Math.round(current)}, melewati target ${Math.round(pTarget)}. Coba turunkan growth rate atau populasi awal.`,
          current,
          pTarget,
          errorRatio,
        );
      }
    } catch (error) {
      setTargetStatus("high", "⚠️ Cek input", "Ada parameter belum valid", error.message || "Periksa input model.");
    }
  }

  function adjustChart() {
    const canvas = document.getElementById("chart");
    const c = canvas && window.Chart?.getChart ? Chart.getChart(canvas) : null;
    if (!c) return;

    if (c.data.datasets[0]) c.data.datasets[0].label = `${MODELS[state.model].name} · Model Utama`;

    if (state.model === "exponential" || state.model === "predatorPrey") {
      c.data.datasets = c.data.datasets.filter((d) => !String(d.label || "").startsWith("K Utama"));
      if (c.options?.scales?.y) delete c.options.scales.y.max;
    }

    c.update("none");
  }

  function refreshApp() {
    const p0 = document.getElementById("P0");
    if (p0) {
      p0.dispatchEvent(new Event("input", { bubbles: true }));
      setTimeout(() => {
        adjustChart();
        refreshTargetStatus();
      }, 0);
    }
  }

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getEmojiOptions() {
    return THEMES[state.theme].emojis.slice();
  }

  function getDisplayReference(series) {
    const target = num("pTarget", NaN);
    if (state.model !== "predatorPrey" && Number.isFinite(target) && target > 0) return target;

    const K = num("K", NaN);
    if (state.model === "logistic" || state.model === "harvesting") {
      if (Number.isFinite(K) && K > 0) return K;
    }

    const maxSeries = Math.max(1, ...(series || []).map((p) => Number(p.y) || 0));
    return maxSeries;
  }

  window.ModelLab = {
    getModel: () => state.model,
    getTheme: () => state.theme,
    getDefinition: () => MODELS[state.model],
    getThemeMeta: () => THEMES[state.theme],
    getEmojiOptions,
    getTargetStatus: () => ({ ...state.targetStatus }),
    getCurrentExtra: () => extra(),
    getCurrentParameter,
    getDisplayReference,
    refreshTargetStatus,
    simulateSeries(parameter, jumlahTitik = 120) {
      return simulateSeries(parameter, state.model, jumlahTitik);
    },
  };

  injectStyle();
  createPanel();
  renderExtra();
  applyTheme();
  applyModelUI();

  ["P0", "r", "K", "T", "pTarget", "tTarget", "rMin", "rMax"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      setTimeout(() => {
        adjustChart();
        refreshTargetStatus();
        dispatch("modellab:parameterchange", {});
      }, 0);
    });
  });

  document.getElementById("btnOpt")?.addEventListener("click", () => setTimeout(refreshTargetStatus, 100));
  document.getElementById("btnClear")?.addEventListener("click", () => setTimeout(refreshTargetStatus, 50));

  refreshApp();
})();
