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
    frame: 0,
    timer: null,
    data: [],
    reference: 1,
    idealIcons: 40,
    maxIcons: 72,
  };

  function injectStyle() {
    const s = document.createElement("style");
    s.textContent = `
      .tw-launch{margin-bottom:16px;padding:16px;border:1px solid var(--garis,#cfdcd8);border-radius:14px;background:rgba(255,255,255,.93);box-shadow:0 10px 28px rgba(24,60,46,.06)}
      .tw-launch-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.tw-launch h2{margin:0 0 3px;font-size:18px}.tw-launch p{margin:0;color:var(--muted,#5b6f6a);font-size:13px}
      .tw-preview{height:180px;margin-top:12px;border:1px solid #cfdcd8;border-radius:16px;display:grid;place-items:center;position:relative;overflow:hidden;cursor:pointer;transition:.25s ease}.tw-preview-emoji{font-size:64px;z-index:2;filter:drop-shadow(0 8px 16px rgba(0,0,0,.12))}.tw-deco{position:absolute;left:0;right:0;bottom:9px;text-align:center;font-size:22px;word-spacing:14px;opacity:.92}
      .tw-preview-hud{position:absolute;top:10px;left:10px;right:10px;z-index:3;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}
      .tw-back{display:none;position:fixed;inset:0;z-index:9999;padding:18px;background:rgba(7,20,15,.72)}.tw-back.open{display:grid;place-items:center}.tw-modal{width:min(1050px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#f7faf9;border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.24)}
      .tw-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:14px 16px;background:#fff;border-bottom:1px solid #d8e4e0;position:sticky;top:0;z-index:5}.tw-head h2{margin:0}.tw-head small{color:#5b6f6a}
      .tw-main{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:12px;padding:12px}.tw-world{min-height:470px;border-radius:16px;position:relative;overflow:hidden;cursor:zoom-in;border:1px solid rgba(255,255,255,.55);transition:.25s ease}.tw-world:fullscreen{min-height:100vh;border-radius:0}
      .tw-world::before,.tw-preview::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 22% 16%,rgba(255,255,255,.45),transparent 21%),radial-gradient(circle at 82% 18%,rgba(255,255,255,.28),transparent 16%);pointer-events:none}
      .tw-pop{position:absolute;inset:64px 18px 68px;display:flex;flex-wrap:wrap;gap:5px;align-content:center;justify-content:center;overflow:hidden;z-index:2}.tw-pop span{line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.12));transition:.15s ease}
      .tw-hud{position:absolute;z-index:3;left:10px;right:10px;top:10px;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}.tw-chip{background:rgba(255,255,255,.89);padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.06)}
      .tw-bottom{position:absolute;left:12px;right:12px;bottom:12px;z-index:3;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.tw-reaction{font-size:13px;padding:7px 11px}
      .tw-reaction.low{background:#e7f1ff;color:#245a9f}.tw-reaction.close{background:#fff1c9;color:#8d6300}.tw-reaction.optimal{background:#ddf8e7;color:#0f6a35}.tw-reaction.high{background:#ffe3e3;color:#a11c1c}.tw-reaction.info,.tw-reaction.idle{background:#edf3f1;color:#31564b}
      .tw-world.optimal,.tw-preview.optimal{box-shadow:0 0 0 3px rgba(36,167,92,.18),0 18px 45px rgba(36,167,92,.18)}.tw-world.high,.tw-preview.high{box-shadow:0 0 0 3px rgba(201,55,55,.12),0 18px 45px rgba(201,55,55,.13)}
      .tw-settings{padding:14px;background:#fff;border:1px solid #d8e4e0;border-radius:14px}.tw-setting{margin-bottom:12px}.tw-setting label{display:block;margin-bottom:4px;color:#5b6f6a;font-size:12px;font-weight:700}.tw-setting select,.tw-setting input{width:100%}.tw-emojis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:210px;overflow:auto;padding-right:2px}.tw-e{padding:7px;border:1px solid #cfdcd8;border-radius:10px;background:#fff;font-size:24px;cursor:pointer}.tw-e.on{border-color:#1f7a63;background:#e4f1ed}.tw-controls{display:flex;gap:8px;flex-wrap:wrap;padding:0 12px 12px}.tw-note{font-size:11px;color:#5b6f6a;line-height:1.45}
      .tw-spark{position:absolute;z-index:4;font-size:18px;animation:twSpark .9s ease-out forwards;pointer-events:none}@keyframes twSpark{0%{transform:translateY(12px) scale(.4);opacity:0}30%{opacity:1}100%{transform:translateY(-36px) scale(1.15);opacity:0}}
      @media(max-width:760px){.tw-main{grid-template-columns:1fr}.tw-settings{order:-1}.tw-world{min-height:380px}.tw-preview{height:160px}}
    `;
    document.head.appendChild(s);
  }

  function worldBg() {
    const map = {
      forest: "linear-gradient(#c8efff 0 48%,#81ca7e 49%,#68b56b 100%)",
      pond: "linear-gradient(#c9efff 0 46%,#6ed1e9 47%,#2d9bc0 100%)",
      lab: "linear-gradient(#e7edff 0 46%,#c2cdf2 47%,#9fb1df 100%)",
      garden: "linear-gradient(#e0f5ff 0 48%,#cfe89e 49%,#9dca74 100%)",
      wildlife: "linear-gradient(#dff2ff 0 46%,#dcc77e 47%,#bca15f 100%)",
    };
    return map[window.ModelLab.getTheme()] || map.forest;
  }

  function createUI() {
    const right = document.querySelector(".kolom-kanan");
    if (!right || document.getElementById("twBack")) return;

    const launch = document.createElement("section");
    launch.className = "tw-launch";
    launch.innerHTML = `
      <div class="tw-launch-head">
        <div><h2>🌍 Tiny World Simulation</h2><p>Jumlah emoji berubah otomatis mengikuti parameter model.</p></div>
        <button id="twOpen" class="tombol tombol-utama">Explore world</button>
      </div>
      <div id="twPreview" class="tw-preview">
        <div class="tw-preview-hud">
          <span id="twPreviewTheme" class="tw-chip"></span>
          <span id="twPreviewReaction" class="tw-chip tw-reaction idle">✨ Ready</span>
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
            <div id="twPop" class="tw-pop"></div>
            <div id="twDeco" class="tw-deco"></div>
            <div class="tw-bottom">
              <span id="twThemeText" class="tw-chip"></span>
              <span id="twReaction" class="tw-chip tw-reaction idle">✨ Ready</span>
            </div>
          </div>

          <aside class="tw-settings">
            <div class="tw-setting"><label>Population emoji</label><div id="twEmojis" class="tw-emojis"></div></div>
            <div class="tw-setting"><label>Simulation speed</label><select id="twSpeed"><option value="900">0.5×</option><option value="500" selected>1×</option><option value="250">2×</option></select></div>
            <div class="tw-setting"><label>Emoji size: <span id="twSizeText">30</span>px</label><input id="twSize" type="range" min="20" max="46" value="30"></div>
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

  function rebuildEmojiChoices() {
    const box = document.getElementById("twEmojis");
    const options = window.ModelLab.getEmojiOptions();
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

  function applyTheme() {
    const meta = window.ModelLab.getThemeMeta();
    ["twPreview", "twWorld"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.background = worldBg();
    });
    document.getElementById("twPreviewDeco").textContent = meta.deco;
    document.getElementById("twDeco").textContent = meta.deco;
    document.getElementById("twPreviewTheme").textContent = meta.label;
    document.getElementById("twThemeText").textContent = meta.label;
    rebuildEmojiChoices();
  }

  function applyReaction() {
    const status = window.ModelLab.getTargetStatus();
    const label = status.badge || "✨ Ready";

    ["twReaction", "twPreviewReaction"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.className = `tw-chip tw-reaction ${status.type || "idle"}`;
      el.textContent = label;
      el.title = status.text || "";
    });

    ["twWorld", "twPreview"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("optimal", "high", "low", "close", "info", "idle");
      el.classList.add(status.type || "idle");
    });

    if (status.type === "optimal") celebrate();
  }

  function celebrate() {
    const world = document.getElementById("twWorld");
    if (!world || world.querySelectorAll(".tw-spark").length > 0) return;
    const symbols = ["✨", "🎉", "💚", "⭐"];
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement("span");
      spark.className = "tw-spark";
      spark.textContent = symbols[i % symbols.length];
      spark.style.left = `${12 + Math.random() * 76}%`;
      spark.style.top = `${35 + Math.random() * 38}%`;
      spark.style.animationDelay = `${Math.random() * 0.25}s`;
      world.appendChild(spark);
      setTimeout(() => spark.remove(), 1300);
    }
  }

  function refresh() {
    pause();
    const parameter = window.ModelLab.getCurrentParameter();
    const series = window.ModelLab.simulateSeries(parameter, 100)[0];
    state.data = series.data;
    state.frame = 0;
    state.reference = Math.max(1, window.ModelLab.getDisplayReference(state.data));

    const def = window.ModelLab.getDefinition();
    document.getElementById("twModelName").textContent = def.name + (window.ModelLab.getModel() === "predatorPrey" ? " · Prey" : "");

    applyTheme();
    applyReaction();
    draw();
  }

  function draw() {
    if (!state.data.length) return;
    const point = state.data[Math.min(state.frame, state.data.length - 1)];
    const real = Math.max(0, Number(point.y) || 0);

    // Target/reference = 40 emoji. Jadi density display berasal dari model, bukan mode manual.
    const ratio = real / Math.max(1, state.reference);
    const count = Math.max(0, Math.min(state.maxIcons, Math.round(ratio * state.idealIcons)));
    const scale = count > 0 ? Math.max(1, Math.round(real / count)) : Math.max(1, Math.round(state.reference / state.idealIcons));

    document.getElementById("twPop").innerHTML = Array.from({ length: count }, () => `<span style="font-size:${state.size}px">${state.emoji}</span>`).join("");
    document.getElementById("twTime").textContent = `t = ${Number(point.x).toFixed(1)}`;
    document.getElementById("twValue").textContent = `Population ≈ ${Math.round(real)}`;
    document.getElementById("twScale").textContent = `1 ${state.emoji} ≈ ${scale}`;
    document.getElementById("twPreviewEmoji").textContent = state.emoji;
    applyReaction();
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
      window.ModelLab.refreshTargetStatus();
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

    window.addEventListener("modellab:themechange", applyTheme);
    window.addEventListener("modellab:modelchange", refresh);
    window.addEventListener("modellab:parameterchange", refresh);
    window.addEventListener("modellab:statuschange", applyReaction);
  }

  injectStyle();
  createUI();
  applyTheme();
  applyReaction();
  bind();
})();
