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
      defaults: { P0: 40, r: 0.22, K: 1000, T: 24 },
    },
    logistic: {
      name: "Logistic Growth",
      description: "Pertumbuhan dengan carrying capacity K.",
      formula: String.raw`\frac{dP}{dt}=rP\left(1-\frac{P}{K}\right)`,
      solution: String.raw`P(t)=\frac{K}{1+\left(\frac{K-P_0}{P_0}\right)e^{-rt}}`,
      defaults: { P0: 50, r: 0.4, K: 1000, T: 30 },
    },
    harvesting: {
      name: "Logistic + Harvesting",
      description: "Model logistik dengan pengurangan populasi konstan H.",
      formula: String.raw`\frac{dP}{dt}=rP\left(1-\frac{P}{K}\right)-H`,
      solution: "Simulasi numerik RK4",
      defaults: { P0: 140, r: 0.5, K: 1000, T: 30, H: 70 },
    },
    predatorPrey: {
      name: "Predator–Prey",
      description: "Model dua populasi Lotka–Volterra. Grafik utama menampilkan prey.",
      formula: String.raw`\frac{dP}{dt}=\alpha P-\beta PQ,\quad \frac{dQ}{dt}=\gamma PQ-\delta Q`,
      solution: "Simulasi numerik RK4",
      defaults: { P0: 60, K: 1000, T: 30, Q0: 9, alpha: 0.6, beta: 0.025, gamma: 0.015, delta: 0.5 },
    },
  };

  const THEMES = {
    forest: {
      label: "🌲 Forest",
      desc: "Hutan hijau dengan populasi kelinci, rusa, pohon, dan kupu-kupu.",
      emojis: ["🐇", "🦌", "🌲", "🦋", "🦔", "🍄"],
      bg: "linear-gradient(180deg,#e9f7f0 0%,#f6fbf8 55%,#eef7f1 100%)",
      deco: "🌲 🌳 🌿 ☁️",
    },
    pond: {
      label: "🌊 Pond",
      desc: "Kolam dengan ikan, katak, teratai, dan alga.",
      emojis: ["🐟", "🐸", "🪷", "🦆", "🌿", "🦐"],
      bg: "linear-gradient(180deg,#e8f8ff 0%,#f7fcff 55%,#eef8ff 100%)",
      deco: "☁️ 🌊 🪷 💧",
    },
    lab: {
      label: "🧫 Microbiology Lab",
      desc: "Lab mini dengan mikroba dan eksperimen pertumbuhan.",
      emojis: ["🦠", "🧫", "🔬", "🧪", "🫧", "✨"],
      bg: "linear-gradient(180deg,#eef1ff 0%,#fafbff 55%,#f2f4ff 100%)",
      deco: "🧫 🔬 ✨ 🫧",
    },
    garden: {
      label: "🌼 Garden",
      desc: "Taman kecil dengan bunga, lebah, dan kupu-kupu.",
      emojis: ["🌼", "🌷", "🐝", "🦋", "🐞", "🌱"],
      bg: "linear-gradient(180deg,#fff8ea 0%,#fffdf7 55%,#fff5e8 100%)",
      deco: "🌼 🌷 🌿 ☀️",
    },
    wildlife: {
      label: "🦁 Wildlife Reserve",
      desc: "Suasana cagar alam dengan hewan liar dan alam terbuka.",
      emojis: ["🦁", "🦓", "🐘", "🦒", "🌴", "🦬"],
      bg: "linear-gradient(180deg,#fff3db 0%,#fffaf0 55%,#ffefd4 100%)",
      deco: "🌴 ☀️ 🪨 🌿",
    },
  };

  const state = {
    model: "logistic",
    theme: "forest",
    optimizationStatus: { type: "idle", text: "Atur target lalu coba optimasi ✨" },
  };

  function num(id, fallback) {
    const el = document.getElementById(id);
    const value = Number(el?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(min, max, digit = 0) {
    const value = min + Math.random() * (max - min);
    return Number(value.toFixed(digit));
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
    const d = MODELS[state.model].defaults;
    return {
      H: num("mlH", d.H ?? 50),
      Q0: num("mlQ0", d.Q0 ?? 9),
      alpha: num("mlAlpha", d.alpha ?? 0.6),
      beta: num("mlBeta", d.beta ?? 0.025),
      gamma: num("mlGamma", d.gamma ?? 0.015),
      delta: num("mlDelta", d.delta ?? 0.5),
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
      body[data-ml-theme="forest"]{background:${THEMES.forest.bg}}
      body[data-ml-theme="pond"]{background:${THEMES.pond.bg}}
      body[data-ml-theme="lab"]{background:${THEMES.lab.bg}}
      body[data-ml-theme="garden"]{background:${THEMES.garden.bg}}
      body[data-ml-theme="wildlife"]{background:${THEMES.wildlife.bg}}
      .model-lab-panel{position:relative;overflow:hidden;border:1px solid var(--garis,#cfdcd8);background:rgba(255,255,255,.92);backdrop-filter:blur(4px);border-radius:14px;padding:16px;margin-bottom:16px;box-shadow:0 10px 28px rgba(24,60,46,.06)}
      .model-lab-panel h2{margin:0 0 4px;font-size:18px}
      .model-lab-sub{margin:0 0 12px;color:var(--muted,#5b6f6a);font-size:13px}
      .ml-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding:10px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(31,122,99,.08),rgba(37,99,235,.06))}
      .ml-hero strong{display:block;font-size:14px}
      .ml-hero small{color:#5b6f6a}
      .ml-hero .ml-deco{font-size:24px;letter-spacing:4px;white-space:nowrap}
      .ml-group-title{margin:12px 0 7px;font-size:12px;font-weight:700;color:var(--muted,#5b6f6a);text-transform:uppercase;letter-spacing:.04em}
      .ml-radio{display:flex;gap:8px;align-items:center;margin:7px 0;font-size:13px}.ml-radio input{accent-color:var(--hijau,#1f7a63)}
      .ml-summary,.ml-mood,.ml-presets{margin-top:12px;padding:12px;border-radius:12px;background:#f6faf8;border:1px solid #e1ece8;font-size:12px}
      .ml-summary strong{display:block;margin-bottom:2px;font-size:14px}
      .ml-extra{margin-top:12px;padding-top:10px;border-top:1px solid var(--garis,#cfdcd8)}
      .ml-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ml-extra label{font-size:12px;color:var(--muted,#5b6f6a)}.ml-extra input{width:100%;margin-top:3px}
      .ml-note{margin:8px 0 0;color:var(--muted,#5b6f6a);font-size:11px;line-height:1.45}
      .ml-hidden{display:none!important}
      .ml-preset-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}
      .ml-preset{padding:9px 10px;border-radius:10px;border:1px solid #d4e3dd;background:#fff;cursor:pointer;font-size:12px;font-weight:700;color:#1e3b34}
      .ml-preset:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(25,51,42,.08)}
      .ml-preset small{display:block;margin-top:2px;font-size:10px;font-weight:400;color:#5b6f6a}
      .ml-mood-row{display:flex;align-items:center;gap:10px}
      .ml-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;font-weight:700}
      .ml-badge.idle{background:#eef4f2;color:#31564b}
      .ml-badge.success{background:#dbf9e6;color:#0f6a35}
      .ml-badge.warn{background:#fff0c7;color:#9a6300}
      .ml-badge.fail{background:#ffe1e1;color:#a11c1c}
      .ml-mood p{margin:8px 0 0;color:#5b6f6a;line-height:1.45}
      @media(max-width:760px){.ml-preset-grid{grid-template-columns:1fr 1fr}.ml-extra-grid{grid-template-columns:1fr}.ml-hero{flex-direction:column;align-items:flex-start}.ml-hero .ml-deco{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  function dispatch(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function createPanel() {
    const left = document.querySelector(".kolom-kiri");
    if (!left || document.getElementById("modelLabPanel")) return;

    const panel = document.createElement("section");
    panel.id = "modelLabPanel";
    panel.className = "model-lab-panel";
    panel.innerHTML = `
      <div class="ml-hero">
        <div>
          <strong>🧪 Tiny Worlds Lab</strong>
          <small>Pilih model, tema, lalu mainkan parameter secara interaktif.</small>
        </div>
        <div id="mlHeroDeco" class="ml-deco">🌲 🌳 🌿 ☁️</div>
      </div>
      <h2>Choose Your Model</h2>
      <p class="model-lab-sub">Semuanya tetap nyambung ke grafik, optimasi, dan Tiny World.</p>

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

      <div class="ml-presets">
        <div class="ml-group-title" style="margin-top:0">Quick parameter actions</div>
        <div class="ml-preset-grid">
          <button class="ml-preset" type="button" data-preset="empty">Kosong<small>mulai kecil</small></button>
          <button class="ml-preset" type="button" data-preset="default">Normal<small>nilai aman</small></button>
          <button class="ml-preset" type="button" data-preset="nearfull">Hampir penuh<small>dekat kapasitas</small></button>
          <button class="ml-preset" type="button" data-preset="boom">Boom<small>pertumbuhan cepat</small></button>
          <button class="ml-preset" type="button" data-preset="balanced">Stabil<small>lebih kalem</small></button>
          <button class="ml-preset" type="button" data-preset="random">Acak<small>surprise me</small></button>
        </div>
        <p class="ml-note">Tombol ini cuma mengubah input dan slider yang sudah ada, jadi fitur lama tetap aman.</p>
      </div>

      <div class="ml-summary">
        <span class="ml-group-title" style="margin:0 0 6px">Selected configuration</span>
        <strong id="mlSummaryModel">Logistic Growth</strong>
        <span id="mlSummaryTheme">Theme: Forest</span>
        <p id="mlSummaryDesc" class="ml-note">Pertumbuhan dengan carrying capacity K.</p>
      </div>

      <div class="ml-mood">
        <div class="ml-mood-row">
          <span id="mlMoodBadge" class="ml-badge idle">✨ Ready</span>
          <strong id="mlMoodTitle">Coba atur parameter dulu</strong>
        </div>
        <p id="mlMoodText">Kalau hasil di waktu target mendekati populasi target, nanti muncul respon “Yay!”.</p>
      </div>
    `;

    left.insertBefore(panel, left.firstElementChild);

    panel.querySelectorAll('input[name="mlModel"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        state.model = radio.value;
        renderExtra();
        applyModelDefaults(false);
        applyModelUI();
        refreshApp();
        refreshOptimizationMood();
        dispatch("modellab:modelchange", { model: state.model });
      });
    });

    panel.querySelectorAll('input[name="mlTheme"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        state.theme = radio.value;
        applyThemeDecor();
        updateSummary();
        dispatch("modellab:themechange", { theme: state.theme });
      });
    });

    panel.querySelectorAll(".ml-preset").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyPreset(btn.dataset.preset);
      });
    });
  }

  function extraField(id, label, value, step) {
    return `<label>${label}<input type="number" id="${id}" value="${value}" step="${step}"></label>`;
  }

  function renderExtra() {
    const box = document.getElementById("mlExtra");
    if (!box) return;
    const d = MODELS[state.model].defaults;

    if (state.model === "harvesting") {
      box.innerHTML = `
        <div class="ml-group-title">Additional parameter</div>
        <div class="ml-extra-grid">
          ${extraField("mlH", "Harvesting rate (H)", d.H ?? 50, 1)}
        </div>
      `;
    } else if (state.model === "predatorPrey") {
      box.innerHTML = `
        <div class="ml-group-title">Predator–Prey parameters</div>
        <div class="ml-extra-grid">
          ${extraField("mlQ0", "Predator awal (Q₀)", d.Q0 ?? 9, 1)}
          ${extraField("mlAlpha", "α", d.alpha ?? 0.6, 0.01)}
          ${extraField("mlBeta", "β", d.beta ?? 0.025, 0.001)}
          ${extraField("mlGamma", "γ", d.gamma ?? 0.015, 0.001)}
          ${extraField("mlDelta", "δ", d.delta ?? 0.5, 0.01)}
        </div>
        <p class="ml-note">Grafik utama dan Tiny World menampilkan prey supaya tetap satu populasi visual.</p>
      `;
    } else {
      box.innerHTML = "";
    }

    box.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        refreshApp();
        refreshOptimizationMood();
        dispatch("modellab:extrachange", { model: state.model });
      });
    });
  }

  function setFormula() {
    const model = MODELS[state.model];
    const formula = document.getElementById("rumusModel");
    const solution = document.getElementById("rumusAnalitik");

    if (!formula || !solution) return;

    if (window.katex && model.formula.startsWith("\\")) {
      try { katex.render(model.formula, formula, { throwOnError: false }); }
      catch { formula.textContent = model.formula; }
    } else {
      formula.textContent = model.formula;
    }

    if (window.katex && model.solution.startsWith("\\")) {
      try { katex.render(model.solution, solution, { throwOnError: false }); }
      catch { solution.textContent = model.solution; }
    } else {
      solution.textContent = model.solution;
    }
  }

  function applyThemeDecor() {
    document.body.setAttribute("data-ml-theme", state.theme);
    const deco = document.getElementById("mlHeroDeco");
    if (deco) deco.textContent = THEMES[state.theme].deco;
  }

  function setInputValue(id, value) {
    const input = document.getElementById(id);
    const slider = document.getElementById(`slider_${id}`);
    if (input) input.value = value;
    if (slider) slider.value = value;
  }

  function syncAndRefresh() {
    ["P0", "r", "K", "T"].forEach((id) => {
      const input = document.getElementById(id);
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    refreshOptimizationMood();
  }

  function applyModelDefaults(refresh = true) {
    const d = MODELS[state.model].defaults;
    setInputValue("P0", d.P0 ?? 50);
    if (d.r !== undefined) setInputValue("r", d.r);
    if (d.K !== undefined) setInputValue("K", d.K);
    if (d.T !== undefined) setInputValue("T", d.T);

    if (document.getElementById("mlH") && d.H !== undefined) document.getElementById("mlH").value = d.H;
    if (document.getElementById("mlQ0") && d.Q0 !== undefined) document.getElementById("mlQ0").value = d.Q0;
    if (document.getElementById("mlAlpha") && d.alpha !== undefined) document.getElementById("mlAlpha").value = d.alpha;
    if (document.getElementById("mlBeta") && d.beta !== undefined) document.getElementById("mlBeta").value = d.beta;
    if (document.getElementById("mlGamma") && d.gamma !== undefined) document.getElementById("mlGamma").value = d.gamma;
    if (document.getElementById("mlDelta") && d.delta !== undefined) document.getElementById("mlDelta").value = d.delta;

    if (refresh) syncAndRefresh();
  }

  function applyPreset(kind) {
    const K = num("K", MODELS[state.model].defaults.K ?? 1000);

    if (kind === "default") {
      applyModelDefaults();
      dispatch("modellab:presetchange", { kind, model: state.model });
      return;
    }

    if (state.model === "predatorPrey") {
      if (kind === "empty") {
        setInputValue("P0", 20); setInputValue("T", 20);
        document.getElementById("mlQ0").value = 4;
      } else if (kind === "nearfull") {
        setInputValue("P0", 120); setInputValue("T", 30);
        document.getElementById("mlQ0").value = 8;
      } else if (kind === "boom") {
        setInputValue("P0", 90); setInputValue("T", 40);
        document.getElementById("mlQ0").value = 3;
        document.getElementById("mlAlpha").value = 0.8;
        document.getElementById("mlBeta").value = 0.015;
      } else if (kind === "balanced") {
        setInputValue("P0", 60); setInputValue("T", 30);
        document.getElementById("mlQ0").value = 9;
        document.getElementById("mlAlpha").value = 0.6;
        document.getElementById("mlBeta").value = 0.025;
        document.getElementById("mlGamma").value = 0.015;
        document.getElementById("mlDelta").value = 0.5;
      } else if (kind === "random") {
        setInputValue("P0", randomBetween(20, 140));
        setInputValue("T", randomBetween(20, 50));
        document.getElementById("mlQ0").value = randomBetween(3, 16);
        document.getElementById("mlAlpha").value = randomBetween(0.35, 0.95, 2);
        document.getElementById("mlBeta").value = randomBetween(0.008, 0.04, 3);
        document.getElementById("mlGamma").value = randomBetween(0.008, 0.03, 3);
        document.getElementById("mlDelta").value = randomBetween(0.2, 0.8, 2);
      }
    } else {
      if (kind === "empty") {
        setInputValue("P0", 10);
        if (state.model !== "exponential") setInputValue("K", K);
        setInputValue("r", 0.12);
        setInputValue("T", 18);
        if (document.getElementById("mlH")) document.getElementById("mlH").value = 20;
      } else if (kind === "nearfull") {
        setInputValue("P0", Math.round(0.9 * K));
        if (state.model !== "exponential") setInputValue("K", K);
        setInputValue("r", 0.18);
        setInputValue("T", 16);
        if (document.getElementById("mlH")) document.getElementById("mlH").value = 15;
      } else if (kind === "boom") {
        setInputValue("P0", clamp(Math.round(0.15 * K), 20, 5000));
        setInputValue("r", state.model === "exponential" ? 0.45 : 0.85);
        setInputValue("T", 35);
        if (state.model !== "exponential") setInputValue("K", Math.max(500, K));
        if (document.getElementById("mlH")) document.getElementById("mlH").value = 5;
      } else if (kind === "balanced") {
        setInputValue("P0", clamp(Math.round(0.35 * K), 20, 5000));
        setInputValue("r", state.model === "exponential" ? 0.2 : 0.32);
        setInputValue("T", 24);
        if (state.model !== "exponential") setInputValue("K", K);
        if (document.getElementById("mlH")) document.getElementById("mlH").value = 40;
      } else if (kind === "random") {
        setInputValue("P0", randomBetween(10, Math.max(80, Math.min(2000, K))));
        setInputValue("r", randomBetween(0.08, state.model === "exponential" ? 0.65 : 1.2, 2));
        setInputValue("T", randomBetween(12, 45));
        if (state.model !== "exponential") setInputValue("K", randomBetween(300, 2500));
        if (document.getElementById("mlH")) document.getElementById("mlH").value = randomBetween(0, 120);
      }
    }

    syncAndRefresh();
    dispatch("modellab:presetchange", { kind, model: state.model });
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
      optButton.title = state.model === "predatorPrey" ? "Predator–Prey tidak memakai parameter r yang sama." : "";
    }

    setFormula();
    updateSummary();
  }

  function updateSummary() {
    const m = MODELS[state.model];
    const themeObj = THEMES[state.theme];

    const modelEl = document.getElementById("mlSummaryModel");
    const themeEl = document.getElementById("mlSummaryTheme");
    const descEl = document.getElementById("mlSummaryDesc");

    if (modelEl) modelEl.textContent = m.name;
    if (themeEl) themeEl.textContent = `Theme: ${themeObj.label.replace(/^.\s*/, "")}`;
    if (descEl) descEl.textContent = `${m.description} ${themeObj.desc}`;
  }

  function setMood(type, badge, title, text) {
    state.optimizationStatus = { type, badge, title, text };
    const badgeEl = document.getElementById("mlMoodBadge");
    const titleEl = document.getElementById("mlMoodTitle");
    const textEl = document.getElementById("mlMoodText");
    if (badgeEl) {
      badgeEl.className = `ml-badge ${type}`;
      badgeEl.textContent = badge;
    }
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    dispatch("modellab:optimizationstatus", state.optimizationStatus);
  }

  function refreshOptimizationMood() {
    if (state.model === "predatorPrey") {
      setMood("warn", "🧪 Predator–Prey", "Mode dua populasi aktif", "Optimasi r dimatikan karena model ini memakai α, β, γ, dan δ.");
      return;
    }

    const pTarget = num("pTarget", NaN);
    const tTarget = num("tTarget", NaN);
    if (!Number.isFinite(pTarget) || !Number.isFinite(tTarget) || pTarget <= 0 || tTarget <= 0) {
      setMood("idle", "✨ Ready", "Coba atur parameter dulu", "Kalau hasil di waktu target mendekati populasi target, nanti muncul respon “Yay!”.");
      return;
    }

    try {
      const current = window.ModelLab.getCurrentParameter();
      const result = valueAt(tTarget, current, state.model);
      const error = Math.abs(result - pTarget);
      const relative = error / Math.max(1, pTarget);

      if (relative <= 0.02) {
        setMood("success", "🎉 Yay!", "Target hampir pas", `Pada t = ${tTarget}, populasi ≈ ${Math.round(result)}. Error sangat kecil, jadi setting-mu sudah keren banget.`);
      } else if (relative <= 0.1) {
        setMood("warn", "👏 Close!", "Sudah cukup dekat", `Pada t = ${tTarget}, populasi ≈ ${Math.round(result)}. Tinggal sedikit tuning lagi biar makin presisi.`);
      } else if (result < pTarget) {
        setMood("fail", "🌱 Naikkan growth", "Target masih kurang", `Populasi baru ≈ ${Math.round(result)}. Coba naikkan r, P₀, atau T; kalau harvesting aktif, kecilkan H.`);
      } else {
        setMood("warn", "🚀 Kebanyakan", "Target terlewati", `Populasi ≈ ${Math.round(result)}. Coba kecilkan r atau P₀, atau percepat harvesting.`);
      }
    } catch (error) {
      setMood("fail", "⚠️ Cek input", "Ada parameter belum valid", error.message || "Periksa lagi input model dan target.");
    }
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
        refreshOptimizationMood();
      }, 0);
    }
  }

  function getEmojiOptions() {
    const themeEmojis = THEMES[state.theme].emojis;
    const modelPreferred = {
      exponential: [themeEmojis[0], themeEmojis[2], themeEmojis[5] || themeEmojis[1]],
      logistic: [themeEmojis[0], themeEmojis[1], themeEmojis[2]],
      harvesting: [themeEmojis[0], themeEmojis[3] || themeEmojis[1], themeEmojis[4] || themeEmojis[2]],
      predatorPrey: [themeEmojis[0], themeEmojis[1], themeEmojis[2]],
    };
    const preferred = modelPreferred[state.model] || [];
    return Array.from(new Set([...preferred, ...themeEmojis])).slice(0, 6);
  }

  window.ModelLab = {
    getModel: () => state.model,
    getTheme: () => state.theme,
    getDefinition: () => MODELS[state.model],
    getThemeMeta: () => THEMES[state.theme],
    getEmojiOptions,
    getCurrentExtra: () => extra(),
    getOptimizationStatus: () => ({ ...state.optimizationStatus }),
    valueAt: (t, parameter) => valueAt(t, parameter, state.model),
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
  applyThemeDecor();
  applyModelUI();
  applyModelDefaults(false);

  ["P0", "r", "K", "T", "pTarget", "tTarget", "rMin", "rMax"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      setTimeout(() => {
        adjustChart();
        refreshOptimizationMood();
      }, 0);
    });
  });

  document.getElementById("btnOpt")?.addEventListener("click", () => {
    setTimeout(refreshOptimizationMood, 80);
  });
  document.getElementById("btnClear")?.addEventListener("click", () => {
    setTimeout(refreshOptimizationMood, 30);
  });

  refreshApp();
})();
