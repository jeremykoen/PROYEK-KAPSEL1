(() => {
  "use strict";

  if (!window.ModelLab) {
    console.error("tiny-world.js harus dimuat setelah model-lab.js.");
    return;
  }

  const state = {
    emoji: "🐇",
    speed: 500,
    size: 30,
    maxIcons: 56,
    frame: 0,
    timer: null,
    data: [],
    scale: 1,
  };

  function injectStyle() {
    const s = document.createElement("style");
    s.textContent = `
      .tw-launch{margin-bottom:16px;padding:16px;border:1px solid var(--garis,#cfdcd8);border-radius:14px;background:rgba(255,255,255,.92);box-shadow:0 10px 28px rgba(24,60,46,.06)}
      .tw-launch-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.tw-launch h2{margin:0 0 3px;font-size:18px}.tw-launch p{margin:0;color:var(--muted,#5b6f6a);font-size:13px}
      .tw-preview{height:180px;margin-top:12px;border:1px solid #cfdcd8;border-radius:16px;display:grid;place-items:center;position:relative;overflow:hidden;cursor:pointer;box-shadow:inset 0 -24px 0 rgba(255,255,255,.16)}
      .tw-preview::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 18% 20%,rgba(255,255,255,.5),transparent 28%),radial-gradient(circle at 85% 15%,rgba(255,255,255,.35),transparent 18%)}
      .tw-preview-emoji{font-size:64px;z-index:2;filter:drop-shadow(0 8px 16px rgba(0,0,0,.12))}.tw-deco{position:absolute;left:0;right:0;bottom:9px;text-align:center;font-size:22px;word-spacing:14px;opacity:.92}
      .tw-preview-note{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;z-index:2}
      .tw-chip{background:rgba(255,255,255,.88);padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.06)}
      .tw-back{display:none;position:fixed;inset:0;z-index:9999;padding:18px;background:rgba(7,20,15,.72)}.tw-back.open{display:grid;place-items:center}
      .tw-modal{width:min(1050px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#f7faf9;border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.24)}
      .tw-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:14px 16px;background:#fff;border-bottom:1px solid #d8e4e0;position:sticky;top:0;z-index:5}.tw-head h2{margin:0}.tw-head small{color:#5b6f6a}
      .tw-main{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:12px;padding:12px}
      .tw-world{min-height:470px;border-radius:16px;position:relative;overflow:hidden;cursor:zoom-in;border:1px solid rgba(255,255,255,.5)}.tw-world:fullscreen{min-height:100vh;border-radius:0}
      .tw-world::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 25% 18%,rgba(255,255,255,.38),transparent 20%),radial-gradient(circle at 80% 15%,rgba(255,255,255,.3),transparent 16%),linear-gradient(to top,rgba(255,255,255,.12),transparent 45%)}
      .tw-ambient{position:absolute;inset:0;pointer-events:none;font-size:18px;opacity:.52;padding:12px;display:grid;grid-template-columns:repeat(4,1fr);align-content:space-between;justify-items:center}
      .tw-pop{position:absolute;inset:64px 16px 66px;display:flex;flex-wrap:wrap;gap:4px;align-content:center;justify-content:center;overflow:hidden;z-index:2}.tw-pop span{filter:drop-shadow(0 4px 8px rgba(0,0,0,.12))}
      .tw-hud{position:absolute;z-index:3;left:10px;right:10px;top:10px;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}
      .tw-bottom-note{position:absolute;left:14px;right:14px;bottom:12px;z-index:3;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .tw-settings{padding:14px;background:#fff;border:1px solid #d8e4e0;border-radius:14px}.tw-setting{margin-bottom:12px}.tw-setting label{display:block;margin-bottom:4px;color:#5b6f6a;font-size:12px;font-weight:700}.tw-setting select,.tw-setting input{width:100%}
      .tw-emojis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.tw-e{padding:7px;border:1px solid #cfdcd8;border-radius:10px;background:#fff;font-size:24px;cursor:pointer}.tw-e.on{border-color:#1f7a63;background:#e4f1ed}
      .tw-controls{display:flex;gap:8px;flex-wrap:wrap;padding:0 12px 12px}.tw-note{font-size:11px;color:#5b6f6a;line-height:1.45}.tw-success{font-weight:700}
      .tw-mood-success{background:#dbf9e6;color:#0f6a35}.tw-mood-warn{background:#fff0c7;color:#9a6300}.tw-mood-fail{background:#ffe1e1;color:#a11c1c}.tw-mood-idle{background:#eef4f2;color:#31564b}
      @media(max-width:760px){.tw-main{grid-template-columns:1fr}.tw-settings{order:-1}.tw-world{min-height:380px}.tw-preview{height:160px}}
    `;
    document.head.appendChild(s);
  }

  function createUI() {
    const right = document.querySelector(".kolom-kanan");
    if (!right || document.getElementById("twBack")) return;

    const launch = document.createElement("section");
    launch.className = "tw-launch";
    launch.innerHTML = `
      <div class="tw-launch-head">
        <div>
          <h2>🌍 Tiny World Simulation</h2>
          <p>Visualisasi lucu: satu emoji mewakili populasi yang sedang tumbuh.</p>
        </div>
        <button id="twOpen" class="tombol tombol-utama">Explore world</button>
      </div>
      <div id="twPreview" class="tw-preview">
        <div class="tw-preview-note">
          <span id="twPreviewTheme" class="tw-chip">Theme</span>
          <span id="twPreviewMood" class="tw-chip tw-mood-idle">✨ Ready</span>
        </div>
        <div id="twPreviewEmoji" class="tw-preview-emoji">🐇</div>
        <div id="twPreviewDeco" class="tw-deco"></div>
      </div>
    `;
    right.insertBefore(launch, right.firstElementChild);

    const back = document.createElement("div");
    back.id = "twBack";
    back.className = "tw-back";
    back.innerHTML = `
      <section class="tw-modal">
        <div class="tw-head">
          <div><h2>🌍 Tiny World</h2><small id="twModelName"></small></div>
          <div><button id="twFull" class="tombol">⛶ Fullscreen</button><button id="twClose" class="tombol">✕</button></div>
        </div>
        <div class="tw-main">
          <div id="twWorld" class="tw-world">
            <div class="tw-hud">
              <span id="twTime" class="tw-chip">t = 0</span>
              <span id="twValue" class="tw-chip">Population = 0</span>
              <span id="twScale" class="tw-chip">1 emoji = 1</span>
            </div>
            <div id="twAmbient" class="tw-ambient"></div>
            <div id="twPop" class="tw-pop"></div>
            <div id="twDeco" class="tw-deco"></div>
            <div class="tw-bottom-note">
              <span id="twThemeText" class="tw-chip">Theme</span>
              <span id="twMood" class="tw-chip tw-mood-idle">✨ Ready</span>
            </div>
          </div>
          <aside class="tw-settings">
            <div class="tw-setting"><label>Population emoji</label><div id="twEmojis" class="tw-emojis"></div></div>
            <div class="tw-setting"><label>Speed</label><select id="twSpeed"><option value="900">0.5×</option><option value="500" selected>1×</option><option value="250">2×</option></select></div>
            <div class="tw-setting"><label>Emoji size: <span id="twSizeText">30</span>px</label><input id="twSize" type="range" min="20" max="48" value="30"></div>
            <div class="tw-setting"><label>Max emoji: <span id="twMaxText">56</span></label><input id="twMax" type="range" min="20" max="90" step="2" value="56"></div>
            <div class="tw-setting"><label>View vibe</label><select id="twViewMode"><option value="balanced" selected>Balanced</option><option value="sparse">Sparse</option><option value="crowded">Crowded</option></select></div>
            <p class="tw-note">Emoji pilihan akan mengikuti tema + model. Kalau kamu ganti model/theme di kiri, daftar emoji di sini ikut berubah.</p>
          </aside>
        </div>
        <div class="tw-controls">
          <button id="twStart" class="tombol tombol-utama">▶ Start</button>
          <button id="twPause" class="tombol">⏸ Pause</button>
          <button id="twReset" class="tombol">↺ Reset</button>
          <button id="twRefresh" class="tombol">↻ Refresh parameters</button>
        </div>
      </section>
    `;
    document.body.appendChild(back);
  }

  function themeMeta() {
    return window.ModelLab.getThemeMeta?.() || { label: "🌲 Forest", deco: "🌲 🌳 🌿 ☁️" };
  }

  function worldBackground(themeId) {
    const map = {
      forest: "linear-gradient(#c6ebff 0 47%, #7bc87c 48%, #69b56a 100%)",
      pond: "linear-gradient(#c9ecfa 0 45%, #76d2e7 46%, #2d98bf 100%)",
      lab: "linear-gradient(#e3ebff 0 45%, #b9c7f3 46%, #95abe0 100%)",
      garden: "linear-gradient(#dff5ff 0 47%, #cde69b 48%, #9bc66f 100%)",
      wildlife: "linear-gradient(#d9efff 0 46%, #d8c57e 47%, #b89f5f 100%)",
    };
    return map[themeId] || map.forest;
  }

  function rebuildEmojiChoices() {
    const box = document.getElementById("twEmojis");
    if (!box) return;
    const options = window.ModelLab.getEmojiOptions?.() || ["🐇", "🐟", "🌱"];
    if (!options.includes(state.emoji)) state.emoji = options[0];
    box.innerHTML = options.map((e) => `<button class="tw-e ${e === state.emoji ? "on" : ""}" data-e="${e}">${e}</button>`).join("");
    box.querySelectorAll(".tw-e").forEach((btn) => {
      btn.onclick = () => {
        state.emoji = btn.dataset.e;
        box.querySelectorAll(".tw-e").forEach((b) => b.classList.toggle("on", b === btn));
        draw();
      };
    });
  }

  function moodChip() {
    const status = window.ModelLab.getOptimizationStatus?.() || { type: "idle", badge: "✨ Ready" };
    return status;
  }

  function applyMood() {
    const status = moodChip();
    const text = status.badge || "✨ Ready";
    ["twMood", "twPreviewMood"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.className = `tw-chip tw-mood-${status.type || "idle"}`;
      el.textContent = text;
    });
  }

  function ambientSymbols() {
    const themeId = window.ModelLab.getTheme();
    const map = {
      forest: ["☁️", "🌿", "🍃", "🌲", "🌳", "🍄", "🐾", "✨"],
      pond: ["☁️", "💧", "🫧", "🌊", "🪷", "🐚", "✨", "💙"],
      lab: ["✨", "🫧", "🧫", "🔬", "🧪", "⚗️", "💡", "🧬"],
      garden: ["☀️", "🌿", "🌼", "🌷", "🍃", "✨", "🐝", "💛"],
      wildlife: ["☀️", "🌴", "🪨", "🌾", "🐾", "✨", "🦴", "🤎"],
    };
    return map[themeId] || map.forest;
  }

  function paintTheme() {
    const meta = themeMeta();
    const themeId = window.ModelLab.getTheme();
    ["twPreview", "twWorld"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.background = worldBackground(themeId);
    });
    document.getElementById("twPreviewDeco").textContent = meta.deco;
    document.getElementById("twDeco").textContent = meta.deco;
    document.getElementById("twThemeText").textContent = meta.label;
    document.getElementById("twPreviewTheme").textContent = meta.label;
    const ambient = ambientSymbols();
    document.getElementById("twAmbient").innerHTML = ambient.map((item) => `<span>${item}</span>`).join("");
    applyMood();
    rebuildEmojiChoices();
  }

  function applyViewMode() {
    const mode = document.getElementById("twViewMode")?.value || "balanced";
    if (mode === "sparse") {
      state.maxIcons = 34;
      state.size = 24;
    } else if (mode === "crowded") {
      state.maxIcons = 82;
      state.size = 22;
    } else {
      state.maxIcons = 56;
      state.size = 30;
    }
    document.getElementById("twMax").value = state.maxIcons;
    document.getElementById("twSize").value = state.size;
    document.getElementById("twMaxText").textContent = state.maxIcons;
    document.getElementById("twSizeText").textContent = state.size;
    refresh();
  }

  function refresh() {
    pause();

    const parameter = window.ModelLab.getCurrentParameter();
    const series = window.ModelLab.simulateSeries(parameter, 100);
    const first = series[0];

    state.data = first.data;
    state.frame = 0;

    const maxP = Math.max(1, ...state.data.map((p) => Number(p.y) || 0));
    state.scale = Math.max(1, Math.ceil(maxP / state.maxIcons));

    const def = window.ModelLab.getDefinition();
    document.getElementById("twModelName").textContent = def.name + (window.ModelLab.getModel() === "predatorPrey" ? " · Prey" : "");

    paintTheme();
    draw();
  }

  function draw() {
    if (!state.data.length) return;

    const point = state.data[Math.min(state.frame, state.data.length - 1)];
    const real = Math.max(0, Number(point.y) || 0);
    const count = Math.min(state.maxIcons, Math.round(real / state.scale));

    document.getElementById("twPop").innerHTML = Array.from({ length: count }, () => `<span style="font-size:${state.size}px;line-height:1">${state.emoji}</span>`).join("");

    document.getElementById("twTime").textContent = `t = ${Number(point.x).toFixed(1)}`;
    document.getElementById("twValue").textContent = `Population ≈ ${Math.round(real)}`;
    document.getElementById("twScale").textContent = `1 ${state.emoji} ≈ ${state.scale}`;
    document.getElementById("twPreviewEmoji").textContent = state.emoji;
    applyMood();
  }

  function pause() {
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
  }

  function start() {
    if (!state.data.length) refresh();
    pause();

    const tick = () => {
      if (state.frame >= state.data.length - 1) return;
      state.frame += 1;
      draw();
      state.timer = setTimeout(tick, state.speed);
    };

    state.timer = setTimeout(tick, state.speed);
  }

  function reset() {
    pause();
    state.frame = 0;
    draw();
  }

  async function fullscreen() {
    const world = document.getElementById("twWorld");
    try {
      if (!document.fullscreenElement) await world.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  }

  function bind() {
    const open = () => {
      document.getElementById("twBack").classList.add("open");
      refresh();
    };

    document.getElementById("twOpen").onclick = open;
    document.getElementById("twPreview").onclick = open;
    document.getElementById("twClose").onclick = () => {
      pause();
      document.getElementById("twBack").classList.remove("open");
    };
    document.getElementById("twFull").onclick = fullscreen;
    document.getElementById("twWorld").onclick = fullscreen;

    document.getElementById("twStart").onclick = start;
    document.getElementById("twPause").onclick = pause;
    document.getElementById("twReset").onclick = reset;
    document.getElementById("twRefresh").onclick = refresh;

    document.getElementById("twSpeed").onchange = (e) => { state.speed = Number(e.target.value); };
    document.getElementById("twSize").oninput = (e) => {
      state.size = Number(e.target.value);
      document.getElementById("twSizeText").textContent = state.size;
      draw();
    };
    document.getElementById("twMax").oninput = (e) => {
      state.maxIcons = Number(e.target.value);
      document.getElementById("twMaxText").textContent = state.maxIcons;
      refresh();
    };
    document.getElementById("twViewMode").onchange = applyViewMode;

    window.addEventListener("modellab:themechange", paintTheme);
    window.addEventListener("modellab:modelchange", () => { rebuildEmojiChoices(); refresh(); });
    window.addEventListener("modellab:presetchange", refresh);
    window.addEventListener("modellab:optimizationstatus", applyMood);
    window.addEventListener("modellab:extrachange", refresh);
  }

  injectStyle();
  createUI();
  paintTheme();
  rebuildEmojiChoices();
  bind();
})();
