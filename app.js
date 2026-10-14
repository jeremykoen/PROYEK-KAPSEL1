(() => {
  "use strict";

  const DEFAULT_PARAMETER = {
    P0: 50,
    r: 0.4,
    K: 1000,
    T: 30,
  };

  let chart = null;
  let daftarModel = [];
  let warnaAktif = "#2563eb";
  let rSebelumOptimasi = null;
  let pesanTambahan = "";

  function formatAngka(value, digit = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: digit,
    }).format(n);
  }

function buatFormParameter() {
    const box = document.getElementById("formParameter");
    if (!box) return;

    box.innerHTML = `
      <div class="form-parameter-slider">
        <!-- P0: step 1 biar mulus -->
        <div class="field-slider">
          <div class="label-baris">
            <label for="P0">Populasi awal (P₀)</label>
            <input type="number" id="P0" min="1" max="5000" step="1" value="${DEFAULT_PARAMETER.P0}" />
          </div>
          <input type="range" id="slider_P0" min="1" max="5000" step="1" value="${DEFAULT_PARAMETER.P0}" />
        </div>

        <!-- r: step 0.01 -->
        <div class="field-slider">
          <div class="label-baris">
            <label for="r">Growth rate (r)</label>
            <input type="number" id="r" min="0" max="2" step="0.01" value="${DEFAULT_PARAMETER.r}" />
          </div>
          <input type="range" id="slider_r" min="0" max="2" step="0.01" value="${DEFAULT_PARAMETER.r}" />
        </div>

        <!-- K: step 10 biar mulus -->
        <div class="field-slider">
          <div class="label-baris">
            <label for="K">Carrying capacity (K)</label>
            <input type="number" id="K" min="10" max="10000" step="10" value="${DEFAULT_PARAMETER.K}" />
          </div>
          <input type="range" id="slider_K" min="10" max="10000" step="10" value="${DEFAULT_PARAMETER.K}" />
        </div>

        <!-- T: step 1 -->
        <div class="field-slider">
          <div class="label-baris">
            <label for="T">Waktu simulasi (T)</label>
            <input type="number" id="T" min="1" max="100" step="1" value="${DEFAULT_PARAMETER.T}" />
          </div>
          <input type="range" id="slider_T" min="1" max="100" step="1" value="${DEFAULT_PARAMETER.T}" />
        </div>
      </div>

      <div class="pilihan-warna-aktif">
        <label for="warnaGarisAktif">
          Warna Garis Model Aktif:
          <input type="color" id="warnaGarisAktif" value="${warnaAktif}" />
        </label>
      </div>
    `;

    // Event Listener
    ["P0", "r", "K", "T"].forEach((id) => {
      const elNumber = document.getElementById(id);
      const elSlider = document.getElementById(`slider_${id}`);

      if (elNumber && elSlider) {
        // Saat slider digeser (Real-time update)
        elSlider.addEventListener("input", (e) => {
          elNumber.value = e.target.value;
          rSebelumOptimasi = null;
          pesanTambahan = "";
          updateGrafik();
        });

        // Saat slider dilepas (Bulatkan khusus P0 dan K ke kelipatan 50)
        elSlider.addEventListener("change", (e) => {
          if (id === "P0" || id === "K") {
            const bulat = Math.max(50, Math.round(Number(e.target.value) / 50) * 50);
            elNumber.value = bulat;
            elSlider.value = bulat;
            updateGrafik();
          }
        });

        // Saat input angka diubah manual
        elNumber.addEventListener("input", (e) => {
          elSlider.value = e.target.value;
          rSebelumOptimasi = null;
          pesanTambahan = "";
          updateGrafik();
        });
      }
    });

    document.getElementById("warnaGarisAktif")?.addEventListener("input", (e) => {
      warnaAktif = e.target.value;
      updateGrafik();
    });
  }

  // Tambahkan sinkronisasi slider untuk Panel Optimasi
  function pasangSliderOptimasi() {
    const listOptimasi = [
      { id: "pTarget", step: 50, min: 1, max: 10000 },
      { id: "tTarget", step: 1, min: 1, max: 100 },
      { id: "rMin", step: 0.01, min: 0, max: 2 },
      { id: "rMax", step: 0.01, min: 0.01, max: 5 }
    ];

    listOptimasi.forEach((item) => {
      const numInput = document.getElementById(item.id);
      const sliderInput = document.getElementById(`slider_${item.id}`);

      if (numInput && sliderInput) {
        numInput.addEventListener("input", (e) => {
          sliderInput.value = e.target.value;
        });

        sliderInput.addEventListener("input", (e) => {
          numInput.value = e.target.value;
        });
      }
    });
  }

// 1. Definisikan getParameter & setParameter terlebih dahulu di atas!
  function getParameter() {
    const p0El = document.getElementById("P0");
    const rEl = document.getElementById("r");
    const kEl = document.getElementById("K");
    const tEl = document.getElementById("T");

    if (!p0El || !rEl || !kEl || !tEl) {
      return { ...DEFAULT_PARAMETER };
    }

    const parameter = {
      P0: Number(p0El.value),
      r: Number(rEl.value),
      K: Number(kEl.value),
      T: Number(tEl.value),
    };

    return window.ModelLogistik.validasiParameter(parameter);
  }

  function getParameterAman() {
    try {
      return getParameter();
    } catch {
      return { ...DEFAULT_PARAMETER };
    }
  }

  function setParameter(parameter) {
    const gabungan = {
      ...getParameterAman(),
      ...parameter,
    };

    const valid = window.ModelLogistik.validasiParameter(gabungan);

    ["P0", "r", "K", "T"].forEach((key) => {
      const elNumber = document.getElementById(key);
      const elSlider = document.getElementById(`slider_${key}`);
      if (elNumber) elNumber.value = valid[key];
      if (elSlider) elSlider.value = valid[key];
    });

    rSebelumOptimasi = null;
    pesanTambahan = "";
    updateGrafik();
  }

  // 2. Fungsi init dipanggil setelah semua fungsi terdefinisi
  function init() {
    buatFormParameter(); // Ini membuat elemen HTML #P0, #r, #K, #T
    buatChart();
    renderRumus();
    pasangEvent();
    
    if (typeof pasangSliderOptimasi === "function") {
      pasangSliderOptimasi();
    }

    if (window.SkenarioEditor) {
      window.SkenarioEditor.init({
        getParameter, // Sekarang getParameter sudah siap & aman dipanggil
        onPilih: setParameter,
      });
    }

    const jsonBox = document.getElementById("jsonBox");
    if (jsonBox) {
      jsonBox.value = JSON.stringify(DEFAULT_PARAMETER, null, 2);
    }

    updateGrafik();
  }

  function buatChart() {
    const canvas = document.getElementById("chart");
    if (!canvas) return;

    canvas.style.minHeight = "400px";

    chart = new Chart(canvas, {
      type: "line",
      data: {
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 2.5,
        animation: {
          duration: 200,
        },
        interaction: {
          intersect: false,
          mode: "nearest",
        },
        parsing: false,
        scales: {
          x: {
            type: "linear",
            title: {
              display: true,
              text: "Waktu (t)",
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Populasi P(t)",
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label(context) {
                const y = context.parsed.y;
                return `${context.dataset.label}: ${formatAngka(y, 3)}`;
              },
            },
          },
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  function updateGrafik() {
    try {
      const parameter = getParameter();
      const dataUtama = window.ModelLogistik.buatDataPopulasi(parameter);

      const labelXText = document.getElementById("labelX")?.value.trim() || "Waktu (t)";
      const labelYText = document.getElementById("labelY")?.value.trim() || "Populasi P(t)";

      if (chart && chart.options.scales) {
        chart.options.scales.x.title.text = labelXText;
        chart.options.scales.y.title.text = labelYText;

        let maxK = parameter.K;
        daftarModel.forEach((m) => {
          if (m.parameter.K > maxK) maxK = m.parameter.K;
        });
        chart.options.scales.y.max = Math.ceil(maxK * 1.1);
      }

      const datasetAktif = {
        label: `Model Utama · P₀=${formatAngka(parameter.P0)} · r=${formatAngka(parameter.r, 4)} · K=${formatAngka(parameter.K)}`,
        data: dataUtama,
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.15,
        borderColor: warnaAktif,
      };

      const garisK = {
        label: `K Utama (${formatAngka(parameter.K)})`,
        data: [
          { x: 0, y: parameter.K },
          { x: parameter.T, y: parameter.K },
        ],
        borderWidth: 1.5,
        borderColor: warnaAktif,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
      };

      const datasetsPerbandingan = daftarModel.map((item) => ({
        label: `${item.nama} · P₀=${formatAngka(item.parameter.P0)} · r=${formatAngka(item.parameter.r, 4)} · K=${formatAngka(item.parameter.K)}`,
        data: window.ModelLogistik.buatDataPopulasi(item.parameter),
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
        borderColor: item.warna,
      }));

      chart.data.datasets = [datasetAktif, garisK, ...datasetsPerbandingan];
      chart.update();

      renderDaftarModelUI();

      const pAkhir = window.ModelLogistik.populasiLogistik(
        parameter.T,
        parameter.P0,
        parameter.r,
        parameter.K
      );

      const info = document.getElementById("info");
      if (info) {
        info.innerHTML = `
          <p>
            <strong>Hasil simulasi utama:</strong>
            pada ${escapeHtml(labelXText)} = ${formatAngka(parameter.T)},
            ${escapeHtml(labelYText)} ≈ <strong>${formatAngka(pAkhir, 3)}</strong>.
            Carrying capacity K = ${formatAngka(parameter.K)}.
          </p>
          ${pesanTambahan ? `<p>${pesanTambahan}</p>` : ""}
        `;
      }
    } catch (error) {
      const info = document.getElementById("info");
      if (info) {
        info.innerHTML = `<p class="error"><strong>Periksa parameter:</strong> ${escapeHtml(error.message)}</p>`;
      }
    }
  }

  // --- KELOLA MODEL PERBANDINGAN ---

  function tambahModelKeDaftar() {
    try {
      const parameter = getParameter();
      const inputNama = document.getElementById("namaModelBaru");
      const nama = (inputNama && inputNama.value.trim()) ? inputNama.value.trim() : `Model #${daftarModel.length + 1}`;

      const warnaPreset = [
        "#dc2626", "#059669", "#7c3aed", "#d97706",
        "#0891b2", "#be123c", "#4f46e5", "#15803d"
      ];
      const warnaDefault = warnaPreset[daftarModel.length % warnaPreset.length];

      const modelBaru = {
        id: "model-" + Date.now(),
        nama: nama,
        parameter: { ...parameter },
        warna: warnaDefault,
      };

      daftarModel.push(modelBaru);

      if (inputNama) inputNama.value = "";
      pesanTambahan = `Model "${nama}" ditambahkan ke perbandingan.`;
      
      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>Gagal menambah model:</strong> ${escapeHtml(error.message)}`;
      updateGrafik();
    }
  }

  function hapusModelDariDaftar(id) {
    daftarModel = daftarModel.filter((m) => m.id !== id);
    pesanTambahan = "Model berhasil dihapus.";
    updateGrafik();
  }

  function ubahWarnaModel(id, warnaBaru) {
    const model = daftarModel.find((m) => m.id === id);
    if (model) {
      model.warna = warnaBaru;
      updateGrafik();
    }
  }

  function renderDaftarModelUI() {
    const container = document.getElementById("daftarModelContainer");
    if (!container) return;

    if (daftarModel.length === 0) {
      container.innerHTML = `<p class="teks-kosong">Belum ada model perbandingan yang disimpan.</p>`;
      return;
    }

    container.innerHTML = daftarModel
      .map(
        (m) => `
        <div class="item-model-perbandingan">
          <div class="info-model">
            <input 
              type="color" 
              class="input-warna-model" 
              value="${m.warna}" 
              data-id="${m.id}"
              title="Ubah warna garis"
            />
            <div class="detail-teks">
              <strong>${escapeHtml(m.nama)}</strong>
              <small>P₀=${formatAngka(m.parameter.P0)}, r=${formatAngka(m.parameter.r, 3)}, K=${formatAngka(m.parameter.K)}</small>
            </div>
          </div>
          <button 
            type="button" 
            class="tombol-hapus-item" 
            data-id="${m.id}"
          >
            ✕ Hapus
          </button>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".input-warna-model").forEach((input) => {
      input.addEventListener("input", (e) => ubahWarnaModel(e.target.dataset.id, e.target.value));
    });

    container.querySelectorAll(".tombol-hapus-item").forEach((btn) => {
      btn.addEventListener("click", (e) => hapusModelDariDaftar(e.target.dataset.id));
    });
  }

  function escapeHtml(teks) {
    return String(teks)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function lakukanOptimasi() {
    try {
      const parameter = getParameter();

      const pTarget = Number(document.getElementById("pTarget").value);
      const tTarget = Number(document.getElementById("tTarget").value);
      const rMin = Number(document.getElementById("rMin").value);
      const rMax = Number(document.getElementById("rMax").value);

      if (rSebelumOptimasi === null) {
        rSebelumOptimasi = parameter.r;
      }

      const hasil = window.OptimasiPopulasi.cariROptimal({
        P0: parameter.P0,
        K: parameter.K,
        pTarget,
        tTarget,
        rMin,
        rMax,
      });

      document.getElementById("r").value = hasil.rOptimal.toFixed(8);

      const statusRentang = hasil.targetDalamRentang
        ? "Target dapat dicapai dalam rentang r yang diberikan."
        : "Target berada di luar rentang; ditampilkan r dengan error terkecil.";

      pesanTambahan = `
        <strong>Optimasi:</strong> r optimal ≈ <strong>${formatAngka(hasil.rOptimal, 6)}</strong>. ${statusRentang}
      `;

      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>Optimasi gagal:</strong> ${escapeHtml(error.message)}`;
      updateGrafik();
    }
  }

  function hapusHasilOptimasi() {
    if (rSebelumOptimasi !== null) {
      document.getElementById("r").value = rSebelumOptimasi;
    }

    rSebelumOptimasi = null;
    pesanTambahan = "";
    updateGrafik();
  }

  function simpanKeJson() {
    try {
      const parameter = getParameter();
      document.getElementById("jsonBox").value = JSON.stringify(parameter, null, 2);
      pesanTambahan = "Parameter disalin ke JSON.";
      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>Gagal:</strong> ${escapeHtml(error.message)}`;
      updateGrafik();
    }
  }

  function muatDariJson() {
    try {
      const raw = document.getElementById("jsonBox").value.trim();
      if (!raw) throw new Error("Kotak JSON kosong.");

      const data = JSON.parse(raw);
      setParameter({
        P0: Number(data.P0),
        r: Number(data.r),
        K: Number(data.K),
        T: Number(data.T),
      });
      pesanTambahan = "Parameter dimuat dari JSON.";
    } catch (error) {
      pesanTambahan = `<strong>JSON error:</strong> ${escapeHtml(error.message)}`;
      updateGrafik();
    }
  }

  function renderRumus() {
    if (!window.katex) return;
    try {
      katex.render(
        String.raw`\frac{dP}{dt}=rP\left(1-\frac{P}{K}\right)`,
        document.getElementById("rumusModel"),
        { throwOnError: false }
      );
      katex.render(
        String.raw`P(t)=\frac{K}{1+\left(\frac{K-P_0}{P_0}\right)e^{-rt}}`,
        document.getElementById("rumusAnalitik"),
        { throwOnError: false }
      );
    } catch (e) {
      console.warn("KaTeX error:", e);
    }
  }

function pasangEvent() {
    document.getElementById("btnOpt")?.addEventListener("click", lakukanOptimasi);
    document.getElementById("btnClear")?.addEventListener("click", hapusHasilOptimasi);
    document.getElementById("btnTambahModel")?.addEventListener("click", tambahModelKeDaftar);
    document.getElementById("btnSimpan")?.addEventListener("click", simpanKeJson);
    document.getElementById("btnMuat")?.addEventListener("click", muatDariJson);

    // DARTARKAN TOMBOL EXPORT EXCEL DI SINI:
    document.getElementById("btnExportExcel")?.addEventListener("click", eksporKeExcel);

    ["labelX", "labelY"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", updateGrafik);
    });
  }

function init() {
    buatFormParameter();
    buatChart();
    renderRumus();
    pasangEvent();
    pasangSliderOptimasi(); // <--- Tambahkan di sini

    if (window.SkenarioEditor) {
      window.SkenarioEditor.init({
        getParameter,
        onPilih: setParameter,
      });
    }

    const jsonBox = document.getElementById("jsonBox");
    if (jsonBox) {
      jsonBox.value = JSON.stringify(DEFAULT_PARAMETER, null, 2);
    }

    updateGrafik();
  }

function eksporKeExcel() {
    try {
      const parameter = getParameter();
      const dataPopulasi = window.ModelLogistik.buatDataPopulasi(parameter);

      const pAkhir = window.ModelLogistik.populasiLogistik(
        parameter.T,
        parameter.P0,
        parameter.r,
        parameter.K
      );

      // Buat Format Tabel HTML / XML yang dapat dibaca langsung oleh Excel (.xls/.xlsx)
      let excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"/></head>
        <body>
          <h2>RINGKASAN SIMULASI POPULASI LOGISTIK</h2>
          <table border="1">
            <tr><td><b>Populasi Awal (P0)</b></td><td>${parameter.P0}</td></tr>
            <tr><td><b>Growth Rate (r)</b></td><td>${parameter.r}</td></tr>
            <tr><td><b>Carrying Capacity (K)</b></td><td>${parameter.K}</td></tr>
            <tr><td><b>Waktu Simulasi (T)</b></td><td>${parameter.T}</td></tr>
            <tr><td><b>Populasi Akhir P(${parameter.T})</b></td><td>${pAkhir.toFixed(4)}</td></tr>
          </table>
          <br/>
          <h2>DATA TIME SERIES SIMULASI</h2>
          <table border="1">
            <tr style="background-color: #1f7a63; color: #ffffff;">
              <th>Waktu (t)</th>
              <th>Populasi P(t)</th>
              <th>Laju Pertumbuhan (dP/dt)</th>
            </tr>
      `;

      dataPopulasi.forEach((pt) => {
        const dPdt = parameter.r * pt.y * (1 - pt.y / parameter.K);
        excelContent += `
          <tr>
            <td>${pt.x.toFixed(2)}</td>
            <td>${pt.y.toFixed(4)}</td>
            <td>${dPdt.toFixed(4)}</td>
          </tr>
        `;
      });

      excelContent += `
          </table>
        </body>
        </html>
      `;

      // Buat Blob File & Unduh Langsung
      const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Simulasi_Logistik_P0=${parameter.P0}_r=${parameter.r}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      alert("Gagal mengekspor Excel: " + err.message);
    }
  }
  init();
})();