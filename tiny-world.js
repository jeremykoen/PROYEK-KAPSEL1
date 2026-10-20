(() => {
  "use strict";

  if (!window.ModelLab) {
    console.error("tiny-world.js harus dimuat setelah model-lab.js.");
    return;
  }

  const emojiChoices = ["🐇", "🐟", "🌱", "🦋", "🐑", "🐞"];
  const themeStyle = {
    forest: ["🌲 🌳 ☁️ 🌿", "linear-gradient(#bfe4f5 0 47%, #99ca87 48%)"],
    pond: ["☁️ 🌊 🪷 💧", "linear-gradient(#c9ecfa 0 45%, #7bc6dc 46%)"],
    lab: ["🧫 🧪 🔬 ✨", "linear-gradient(#dfe7ff 0 45%, #9fb0da 46%)"],
    garden: ["🌼 🌷 🌿 ☀️", "linear-gradient(#d8f0ff 0 47%, #b3d991 48%)"],
    wildlife: ["🌴 🪨 ☀️ 🌿", "linear-gradient(#d5efff 0 46%, #d0bd78 47%)"],
  };

  const state = {
    emoji: "🐇",
    speed: 500,
    size: 30,
    maxIcons: 50,
    frame: 0,
    timer: null,
    data: [],
    scale: 1,
  };

  function injectStyle() {
    const s = document.createElement("style");
    s.textContent = `
      .tw-launch{margin-bottom:16px;padding:16px;border:1px solid var(--garis,#cfdcd8);border-radius:10px;background:#fff}
      .tw-launch-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.tw-launch h2{margin:0 0 3px;font-size:16px}.tw-launch p{margin:0;color:var(--muted,#5b6f6a);font-size:13px}
      .tw-preview{height:150px;margin-top:12px;border:1px solid #cfdcd8;border-radius:12px;display:grid;place-items:center;position:relative;overflow:hidden;cursor:pointer}.tw-preview-emoji{font-size:58px;z-index:2}.tw-deco{position:absolute;left:0;right:0;bottom:9px;text-align:center;font-size:22px;word-spacing:14px}
      .tw-back{display:none;position:fixed;inset:0;z-index:9999;padding:18px;background:rgba(0,0,0,.7)}.tw-back.open{display:grid;place-items:center}.tw-modal{width:min(1000px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#f7faf9;border-radius:16px}
      .tw-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:14px 16px;background:#fff;border-bottom:1px solid #d8e4e0}.tw-head h2{margin:0}.tw-main{display:grid;grid-template-columns:1fr 250px;gap:12px;padding:12px}
      .tw-world{min-height:450px;border-radius:14px;position:relative;overflow:hidden;cursor:zoom-in}.tw-world:fullscreen{min-height:100vh;border-radius:0}.tw-pop{position:absolute;inset:50px 16px 55px;display:flex;flex-wrap:wrap;gap:4px;align-content:center;justify-content:center;overflow:hidden}.tw-hud{position:absolute;z-index:3;left:10px;right:10px;top:10px;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}.tw-chip{background:rgba(255,255,255,.85);padding:5px 8px;border-radius:999px;font-size:12px;font-weight:700}
      .tw-settings{padding:14px;background:#fff;border:1px solid #d8e4e0;border-radius:14px}.tw-setting{margin-bottom:12px}.tw-setting label{display:block;margin-bottom:4px;color:#5b6f6a;font-size:12px;font-weight:700}.tw-setting select,.tw-setting input{width:100%}.tw-emojis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.tw-e{padding:7px;border:1px solid #cfdcd8;border-radius:8px;background:#fff;font-size:22px;cursor:pointer}.tw-e.on{border-color:#1f7a63;background:#e4f1ed}.tw-controls{display:flex;gap:8px;flex-wrap:wrap;padding:0 12px 12px}.tw-note{font-size:11px;color:#5b6f6a}
      @media(max-width:760px){.tw-main{grid-template-columns:1fr}.tw-settings{order:-1}.tw-world{min-height:370px}}
    `;
    document.head.appendChild(s);
  }

  function createUI() {
    const right = document.querySelector(".kolom-kanan");
    if (!right) return;

    const launch = document.createElement("section");
    launch.className = "tw-launch";
    launch.innerHTML = `
      <div class="tw-launch-head">
        <div><h2>🌍 Tiny World Simulation</h2><p>Direct visualization of one emoji population.</p></div>
        <button id="twOpen" class="tombol tombol-utama">Explore</button>
      </div>
      <div id="twPreview" class="tw-preview">
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
          </div>
          <aside class="tw-settings">
            <div class="tw-setting"><label>Population emoji</label><div class="tw-emojis">${emojiChoices.map(e=>`<button class="tw-e ${e==="🐇"?"on":""}" data-e="${e}">${e}</button>`).join("")}</div></div>
            <div class="tw-setting"><label>Speed</label><select id="twSpeed"><option value="900">0.5×</option><option value="500" selected>1×</option><option value="250">2×</option></select></div>
            <div class="tw-setting"><label>Emoji size: <span id="twSizeText">30</span>px</label><input id="twSize" type="range" min="20" max="48" value="30"></div>
            <div class="tw-setting"><label>Max emoji: <span id="twMaxText">50</span></label><input id="twMax" type="range" min="20" max="80" step="5" value="50"></div>
            <p class="tw-note">Theme mengikuti pilihan di Choose Your Model. Untuk Predator–Prey, Tiny World menampilkan prey supaya tetap satu emoji.</p>
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

  function theme() {
    return themeStyle[window.ModelLab.getTheme()] || themeStyle.forest;
  }

  function paintTheme() {
    const [deco, bg] = theme();
    ["twPreview", "twWorld"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.background = bg;
    });
    document.getElementById("twPreviewDeco").textContent = deco;
    document.getElementById("twDeco").textContent = deco;
  }

  function refresh() {
    pause();

    const parameter = window.ModelLab.getCurrentParameter();
    const series = window.ModelLab.simulateSeries(parameter, 100);
    const first = series[0];

    state.data = first.data;
    state.frame = 0;

    const maxP = Math.max(1, ...state.data.map(p => Number(p.y) || 0));
    state.scale = Math.max(1, Math.ceil(maxP / state.maxIcons));

    const def = window.ModelLab.getDefinition();
    document.getElementById("twModelName").textContent =
      def.name + (window.ModelLab.getModel() === "predatorPrey" ? " · Prey" : "");

    paintTheme();
    draw();
  }

  function draw() {
    if (!state.data.length) return;

    const point = state.data[Math.min(state.frame, state.data.length - 1)];
    const real = Math.max(0, Number(point.y) || 0);
    const count = Math.min(state.maxIcons, Math.round(real / state.scale));

    document.getElementById("twPop").innerHTML =
      Array.from({length:count},()=>`<span style="font-size:${state.size}px;line-height:1">${state.emoji}</span>`).join("");

    document.getElementById("twTime").textContent = `t = ${Number(point.x).toFixed(1)}`;
    document.getElementById("twValue").textContent = `Population ≈ ${Math.round(real)}`;
    document.getElementById("twScale").textContent = `1 ${state.emoji} ≈ ${state.scale}`;
    document.getElementById("twPreviewEmoji").textContent = state.emoji;
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

    document.querySelectorAll(".tw-e").forEach(btn => {
      btn.onclick = () => {
        state.emoji = btn.dataset.e;
        document.querySelectorAll(".tw-e").forEach(b => b.classList.toggle("on", b === btn));
        draw();
      };
    });

    document.getElementById("twSpeed").onchange = e => state.speed = Number(e.target.value);
    document.getElementById("twSize").oninput = e => {
      state.size = Number(e.target.value);
      document.getElementById("twSizeText").textContent = state.size;
      draw();
    };
    document.getElementById("twMax").oninput = e => {
      state.maxIcons = Number(e.target.value);
      document.getElementById("twMaxText").textContent = state.maxIcons;
      refresh();
    };

    window.addEventListener("modellab:themechange", paintTheme);
  }

  injectStyle();
  createUI();
  paintTheme();
  bind();
})();
