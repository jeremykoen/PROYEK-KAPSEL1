(() => {
  "use strict";

  const DEFAULT_PARAMETER = {
    P0: 50,
    r: 0.4,
    K: 1000,
    T: 30,
  };

  let chart = null;
  let perbandingan = [];
  let pesanTambahan = "";
  let rSebelumOptimasi = null;

  const warnaKurva = [
    "#2563eb",
    "#dc2626",
    "#059669",
    "#7c3aed",
    "#d97706",
    "#0891b2",
    "#be123c",
    "#4f46e5",
  ];

  function formatAngka(value, digit = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";

    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: digit,
    }).format(n);
  }

  function buatFormParameter() {
    const box = document.getElementById("formParameter");

    box.innerHTML = `
      <div class="baris-input">
        <label for="P0">
          Populasi awal (P₀)
          <input type="number" id="P0" min="0.0001" step="1" value="${DEFAULT_PARAMETER.P0}" />
        </label>

        <label for="r">
          Growth rate (r)
          <input type="number" id="r" min="0" step="0.01" value="${DEFAULT_PARAMETER.r}" />
        </label>

        <label for="K">
          Carrying capacity (K)
          <input type="number" id="K" min="0.0001" step="1" value="${DEFAULT_PARAMETER.K}" />
        </label>

        <label for="T">
          Waktu simulasi (T)
          <input type="number" id="T" min="0.0001" step="1" value="${DEFAULT_PARAMETER.T}" />
        </label>
      </div>
    `;

    ["P0", "r", "K", "T"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => {
        rSebelumOptimasi = null;
        pesanTambahan = "";
        updateGrafik();
      });
    });
  }

  function getParameter() {
    const parameter = {
      P0: Number(document.getElementById("P0").value),
      r: Number(document.getElementById("r").value),
      K: Number(document.getElementById("K").value),
      T: Number(document.getElementById("T").value),
    };

    return window.ModelLogistik.validasiParameter(parameter);
  }

  function setParameter(parameter) {
    const gabungan = {
      ...getParameterAman(),
      ...parameter,
    };

    const valid = window.ModelLogistik.validasiParameter(gabungan);

    document.getElementById("P0").value = valid.P0;
    document.getElementById("r").value = valid.r;
    document.getElementById("K").value = valid.K;
    document.getElementById("T").value = valid.T;

    rSebelumOptimasi = null;
    pesanTambahan = "";
    updateGrafik();
  }

  function getParameterAman() {
    try {
      return getParameter();
    } catch {
      return { ...DEFAULT_PARAMETER };
    }
  }

  function buatChart() {
    const canvas = document.getElementById("chart");

    chart = new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Simulasi aktif",
            data: [],
            borderWidth: 3,
            pointRadius: 0,
            tension: 0.15,
            borderColor: warnaKurva[0],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 250,
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

      chart.data.datasets = [
        {
          label: `Aktif · P₀=${formatAngka(parameter.P0)} · r=${formatAngka(
            parameter.r,
            5,
          )} · K=${formatAngka(parameter.K)}`,
          data: dataUtama,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.15,
          borderColor: warnaKurva[0],
        },
        ...perbandingan,
      ];

      chart.update();

      const pAkhir = window.ModelLogistik.populasiLogistik(
        parameter.T,
        parameter.P0,
        parameter.r,
        parameter.K,
      );

      const info = document.getElementById("info");
      info.innerHTML = `
        <p>
          <strong>Hasil simulasi:</strong>
          pada t = ${formatAngka(parameter.T)},
          populasi ≈ <strong>${formatAngka(pAkhir, 3)}</strong>.
          Carrying capacity K = ${formatAngka(parameter.K)}.
        </p>
        ${pesanTambahan ? `<p>${pesanTambahan}</p>` : ""}
      `;
    } catch (error) {
      const info = document.getElementById("info");
      info.innerHTML = `<p><strong>Periksa parameter:</strong> ${escapeHtml(
        error.message,
      )}</p>`;
    }
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
        : "Target berada di luar hasil yang dapat dicapai pada rentang r tersebut; ditampilkan r dengan error terkecil.";

      pesanTambahan = `
        <strong>Optimasi:</strong>
        r optimal ≈ <strong>${formatAngka(hasil.rOptimal, 8)}</strong>,
        menghasilkan P(${formatAngka(tTarget)}) ≈
        <strong>${formatAngka(hasil.populasiHasil, 4)}</strong>,
        error ≈ ${formatAngka(hasil.error, 6)}.
        ${statusRentang}
      `;

      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>Optimasi gagal:</strong> ${escapeHtml(
        error.message,
      )}`;
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

  function tambahPerbandingan() {
    try {
      const parameter = getParameter();
      const indeks = perbandingan.length + 1;
      const warna = warnaKurva[(indeks + 1) % warnaKurva.length];

      perbandingan.push({
        label: `Perbandingan ${indeks} · P₀=${formatAngka(
          parameter.P0,
        )} · r=${formatAngka(parameter.r, 5)} · K=${formatAngka(parameter.K)}`,
        data: window.ModelLogistik.buatDataPopulasi(parameter),
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
        borderDash: [7, 4],
        borderColor: warna,
      });

      pesanTambahan = `Kurva saat ini ditambahkan sebagai perbandingan ${indeks}.`;
      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>Gagal menambah perbandingan:</strong> ${escapeHtml(
        error.message,
      )}`;
      updateGrafik();
    }
  }

  function hapusPerbandingan() {
    perbandingan = [];
    pesanTambahan = "Semua kurva perbandingan dihapus.";
    updateGrafik();
  }

  function simpanKeJson() {
    try {
      const parameter = getParameter();
      document.getElementById("jsonBox").value = JSON.stringify(
        parameter,
        null,
        2,
      );

      pesanTambahan = "Parameter aktif sudah disalin ke kotak JSON.";
      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>Gagal menyimpan JSON:</strong> ${escapeHtml(
        error.message,
      )}`;
      updateGrafik();
    }
  }

  function muatDariJson() {
    try {
      const raw = document.getElementById("jsonBox").value.trim();

      if (!raw) {
        throw new Error("Kotak JSON masih kosong.");
      }

      const data = JSON.parse(raw);

      const parameter = {
        P0: Number(data.P0),
        r: Number(data.r),
        K: Number(data.K),
        T: Number(data.T),
      };

      window.ModelLogistik.validasiParameter(parameter);

      document.getElementById("P0").value = parameter.P0;
      document.getElementById("r").value = parameter.r;
      document.getElementById("K").value = parameter.K;
      document.getElementById("T").value = parameter.T;

      rSebelumOptimasi = null;
      pesanTambahan = "Parameter berhasil dimuat dari JSON.";
      updateGrafik();
    } catch (error) {
      pesanTambahan = `<strong>JSON tidak valid:</strong> ${escapeHtml(
        error.message,
      )}`;
      updateGrafik();
    }
  }

  function renderRumus() {
    if (!window.katex) return;

    try {
      katex.render(
        String.raw`\frac{dP}{dt}=rP\left(1-\frac{P}{K}\right)`,
        document.getElementById("rumusModel"),
        { throwOnError: false },
      );

      katex.render(
        String.raw`P(t)=\frac{K}{1+\left(\frac{K-P_0}{P_0}\right)e^{-rt}}`,
        document.getElementById("rumusAnalitik"),
        { throwOnError: false },
      );
    } catch (error) {
      console.warn("KaTeX gagal dirender:", error);
    }
  }

  function pasangEvent() {
    document.getElementById("btnOpt").addEventListener("click", lakukanOptimasi);
    document
      .getElementById("btnClear")
      .addEventListener("click", hapusHasilOptimasi);

    document
      .getElementById("btnTambahKurva")
      .addEventListener("click", tambahPerbandingan);

    document
      .getElementById("btnHapusKurva")
      .addEventListener("click", hapusPerbandingan);

    document
      .getElementById("btnSimpan")
      .addEventListener("click", simpanKeJson);

    document.getElementById("btnMuat").addEventListener("click", muatDariJson);

    ["pTarget", "tTarget", "rMin", "rMax"].forEach((id) => {
      document.getElementById(id).addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          lakukanOptimasi();
        }
      });
    });
  }

  function init() {
    buatFormParameter();
    buatChart();
    renderRumus();
    pasangEvent();

    window.SkenarioEditor.init({
      getParameter,
      onPilih: setParameter,
    });

    document.getElementById("jsonBox").value = JSON.stringify(
      DEFAULT_PARAMETER,
      null,
      2,
    );

    updateGrafik();
  }

  window.AplikasiPopulasi = {
    getParameter,
    setParameter,
    updateGrafik,
  };

  init();
})();
