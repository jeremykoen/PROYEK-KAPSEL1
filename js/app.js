(() => {
  "use strict";

  let currentModel = "logistic";
  let chart = null;
  let perbandingan = [];
  let compareNo = 0;
  let pesanTambahan = "";
  let rSebelumOptimasi = null;

  const colors = [
    "#2563eb", "#dc2626", "#059669", "#7c3aed",
    "#d97706", "#0891b2", "#be123c", "#4f46e5",
  ];

  function format(value, digits=2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: digits,
    }).format(n);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function currentValues() {
    const values = {};
    document.querySelectorAll("#dynamicParams input").forEach((input) => {
      values[input.dataset.key] = Number(input.value);
    });
    return values;
  }

  function renderParams(seed={}) {
    const def = window.ModelPopulasi.definition(currentModel);
    const defaults = window.ModelPopulasi.defaults(currentModel);

    document.getElementById("dynamicParams").innerHTML = def.params
      .map(([key,label,defaultValue,step]) => {
        const value = seed[key] ?? defaults[key] ?? defaultValue;
        return `
          <div class="field">
            <label>
              ${label}
              <input
                type="number"
                id="${key}"
                data-key="${key}"
                value="${value}"
                step="${step}"
              />
            </label>
          </div>
        `;
      })
      .join("");

    document.querySelectorAll("#dynamicParams input").forEach((input) => {
      input.addEventListener("input", () => {
        pesanTambahan = "";
        rSebelumOptimasi = null;
        updateGrafik();
      });
    });
  }

  function buatFormParameter() {
    const box = document.getElementById("formParameter");

    box.innerHTML = `
      <div class="field">
        <label>
          Pilih model populasi
          <select id="modelSelect">
            ${Object.entries(window.ModelPopulasi.models)
              .map(([id, model]) =>
                `<option value="${id}" ${id===currentModel?"selected":""}>${model.name}</option>`,
              )
              .join("")}
          </select>
        </label>
      </div>

      <p id="modelFormulaInfo"></p>
      <div id="dynamicParams"></div>
    `;

    renderParams();

    document.getElementById("modelSelect").addEventListener("change", (e) => {
      const oldValues = currentValues();
      currentModel = e.target.value;

      const wanted = window.ModelPopulasi.defaults(currentModel);
      const transferable = {};
      Object.keys(wanted).forEach((key) => {
        if (oldValues[key] !== undefined) transferable[key] = oldValues[key];
      });

      renderParams(transferable);
      updateModelInfo();
      pesanTambahan = "";
      rSebelumOptimasi = null;
      updateGrafik();
    });

    updateModelInfo();
  }

  function updateModelInfo() {
    const def = window.ModelPopulasi.definition(currentModel);

    document.getElementById("modelFormulaInfo").textContent =
      `${def.formula} — ${def.analytic}`;

    document.getElementById("rumusModel").textContent = def.formula;
    document.getElementById("rumusAnalitik").textContent = def.analytic;

    // Optimasi r yang lama hanya dipakai untuk logistic.
    const btnOpt = document.getElementById("btnOpt");
    if (btnOpt) {
      btnOpt.disabled = currentModel !== "logistic";
      btnOpt.title =
        currentModel === "logistic"
          ? ""
          : "Untuk sekarang optimasi r hanya aktif pada Logistic Growth.";
    }
  }

  function getRawParameter() {
    const params = currentValues();
    return window.ModelPopulasi.validate(currentModel, params);
  }

  function getParameter() {
    return {
      model: currentModel,
      ...getRawParameter(),
    };
  }

  function getParameterForScenario() {
    // Kompatibilitas dengan skenario-editor.js lama.
    const data = getParameter();
    return {
      ...data,
      P0: data.P0 ?? 50,
      r: data.r ?? 0.4,
      K: data.K ?? 1000,
      T: data.T ?? 30,
    };
  }

  function setParameter(data) {
    currentModel = data.model || "logistic";

    if (!window.ModelPopulasi.models[currentModel]) {
      currentModel = "logistic";
    }

    const select = document.getElementById("modelSelect");
    if (select) select.value = currentModel;

    renderParams(data);
    updateModelInfo();
    pesanTambahan = "";
    rSebelumOptimasi = null;
    updateGrafik();
  }

  function buatChart() {
    chart = new Chart(document.getElementById("chart"), {
      type: "line",
      data: {datasets: []},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        interaction: {intersect:false, mode:"nearest"},
        scales: {
          x: {
            type:"linear",
            title:{display:true,text:"Waktu (t)"},
          },
          y: {
            beginAtZero:true,
            title:{display:true,text:"Populasi"},
          },
        },
        plugins: {
          legend:{position:"bottom"},
        },
      },
    });
  }

  function activeDatasets(series) {
    return series.map((s,index) => ({
      label: `Aktif · ${s.label}`,
      data: s.data,
      borderColor: colors[index % colors.length],
      borderWidth: 3,
      pointRadius: 0,
      tension: 0.12,
    }));
  }

  function updateGrafik() {
    try {
      const params = getRawParameter();
      const series = window.ModelPopulasi.simulate(currentModel, params);

      chart.data.datasets = [
        ...activeDatasets(series),
        ...perbandingan,
      ];
      chart.update();

      const lastInfo = series
        .map((s) => {
          const last = s.data[s.data.length-1];
          return `${s.label} ≈ <strong>${format(last.y,3)}</strong>`;
        })
        .join(" · ");

      document.getElementById("info").innerHTML = `
        <p>
          <strong>${escapeHtml(window.ModelPopulasi.definition(currentModel).name)}</strong>:
          pada t = ${format(params.T)}, ${lastInfo}.
        </p>
        ${pesanTambahan ? `<p>${pesanTambahan}</p>` : ""}
      `;
    } catch (error) {
      document.getElementById("info").innerHTML =
        `<p class="error">${escapeHtml(error.message)}</p>`;
    }
  }

  function lakukanOptimasi() {
    if (currentModel !== "logistic") {
      pesanTambahan =
        "<strong>Optimasi r saat ini hanya tersedia untuk Logistic Growth.</strong>";
      updateGrafik();
      return;
    }

    try {
      const params = getRawParameter();

      const pTarget = Number(document.getElementById("pTarget").value);
      const tTarget = Number(document.getElementById("tTarget").value);
      const rMin = Number(document.getElementById("rMin").value);
      const rMax = Number(document.getElementById("rMax").value);

      if (rSebelumOptimasi === null) rSebelumOptimasi = params.r;

      const hasil = window.OptimasiPopulasi.cariROptimal({
        P0: params.P0,
        K: params.K,
        pTarget,
        tTarget,
        rMin,
        rMax,
      });

      document.getElementById("r").value = hasil.rOptimal.toFixed(8);

      pesanTambahan = `
        <strong>r optimal ≈ ${format(hasil.rOptimal,8)}</strong>,
        P(${format(tTarget)}) ≈ ${format(hasil.populasiHasil,4)},
        error ≈ ${format(hasil.error,6)}.
      `;

      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>Optimasi gagal:</strong> ${escapeHtml(error.message)}`;
      updateGrafik();
    }
  }

  function hapusHasilOptimasi() {
    const inputR = document.getElementById("r");

    if (inputR && rSebelumOptimasi !== null) {
      inputR.value = rSebelumOptimasi;
    }

    rSebelumOptimasi = null;
    pesanTambahan = "";
    updateGrafik();
  }

  function tambahPerbandingan() {
    try {
      const params = getRawParameter();
      const series = window.ModelPopulasi.simulate(currentModel, params);
      const modelName = window.ModelPopulasi.definition(currentModel).name;

      compareNo += 1;

      series.forEach((s,index) => {
        perbandingan.push({
          label: `Perbandingan ${compareNo} · ${modelName} · ${s.label}`,
          data: s.data,
          borderColor: colors[(compareNo+index+1)%colors.length],
          borderWidth: 2,
          borderDash: [7,4],
          pointRadius: 0,
          tension: 0.12,
        });
      });

      pesanTambahan = `Simulasi ditambahkan sebagai perbandingan ${compareNo}.`;
      updateGrafik();
    } catch (error) {
      pesanTambahan = escapeHtml(error.message);
      updateGrafik();
    }
  }

  function hapusPerbandingan() {
    perbandingan = [];
    compareNo = 0;
    pesanTambahan = "Semua kurva perbandingan dihapus.";
    updateGrafik();
  }

  function simpanKeJson() {
    try {
      document.getElementById("jsonBox").value =
        JSON.stringify(getParameter(), null, 2);
    } catch (error) {
      pesanTambahan = escapeHtml(error.message);
      updateGrafik();
    }
  }

  function muatDariJson() {
    try {
      const data = JSON.parse(document.getElementById("jsonBox").value);
      setParameter(data);
      pesanTambahan = "Parameter berhasil dimuat dari JSON.";
      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>JSON tidak valid:</strong> ${escapeHtml(error.message)}`;
      updateGrafik();
    }
  }

  function pasangEvent() {
    document.getElementById("btnOpt").addEventListener("click", lakukanOptimasi);
    document.getElementById("btnClear").addEventListener("click", hapusHasilOptimasi);
    document.getElementById("btnTambahKurva").addEventListener("click", tambahPerbandingan);
    document.getElementById("btnHapusKurva").addEventListener("click", hapusPerbandingan);
    document.getElementById("btnSimpan").addEventListener("click", simpanKeJson);
    document.getElementById("btnMuat").addEventListener("click", muatDariJson);
  }

  function init() {
    buatFormParameter();
    buatChart();
    pasangEvent();

    window.SkenarioEditor.init({
      getParameter: getParameterForScenario,
      onPilih: setParameter,
    });

    document.getElementById("jsonBox").value =
      JSON.stringify(getParameter(), null, 2);

    updateGrafik();
  }

  window.AplikasiPopulasi = {
    getParameter,
    setParameter,
    updateGrafik,
    getModel: () => currentModel,
  };

  init();
})();
