// ================= TAMPILAN (Frontend) =================

const formBox = document.getElementById("formParameter");
const skenarioBox = document.getElementById("skenarioBox");
const infoBox = document.getElementById("info");
const jsonBox = document.getElementById("jsonBox");
const namaSkenarioInput = document.getElementById("namaSkenario");

let hasilOptimasi = null; // hasil optimasi terakhir
let kurvaTersimpan = []; // kurva untuk perbandingan (overlay)

const MAKS_KURVA = 5;
const warnaKurva = ["#8e4a9e", "#b5483a", "#3a8e8e", "#7a7a2f", "#5a5a8e"];

// Daftar parameter: dipakai untuk membangun form (mirip data soal di quiz)
const daftarParameter = [
  { id: "P0", label: "Populasi awal (P₀)", min: 1, max: 2000, step: 1, nilai: 50 },
  { id: "r", label: "Laju pertumbuhan (r)", min: 0.01, max: 2, step: 0.01, nilai: 0.4 },
  { id: "K", label: "Daya dukung (K)", min: 10, max: 2000, step: 10, nilai: 1000 },
  { id: "T", label: "Lama simulasi (T)", min: 1, max: 100, step: 1, nilai: 30 },
];

// ---------- Fungsi bantu ----------
// Mencegah teks buatan pengguna (nama skenario) dibaca sebagai HTML
const escapeHtml = (teks) =>
  String(teks)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function tampilError(pesan) {
  infoBox.innerHTML = `<span class="error">${pesan}</span>`;
}

function validasiParameter({ P0, r, K, T }) {
  const tidakValid = [P0, r, K, T].filter((v) => !(v > 0));
  if (tidakValid.length > 0) {
    return "P₀, r, K, dan T harus diisi dan lebih dari 0.";
  }
  return null;
}

// ---------- Rumus dengan KaTeX ----------
function tampilRumus() {
  if (typeof katex === "undefined") return; // KaTeX gagal dimuat: teks cadangan tetap tampil
  const opsi = { throwOnError: false };
  katex.render(
    "\\frac{dP}{dt} = rP\\left(1 - \\frac{P}{K}\\right)",
    document.getElementById("rumusModel"),
    opsi,
  );
  katex.render(
    "P(t) = \\frac{K}{1 + \\left(\\frac{K-P_0}{P_0}\\right)e^{-rt}}",
    document.getElementById("rumusAnalitik"),
    opsi,
  );
}

// ---------- Membangun form dengan template literal + map ----------
function buildForm() {
  const output = daftarParameter.map(
    (item) => `
    <div class="field">
      <label for="${item.id}">${item.label}
        <input type="number" id="${item.id}" min="${item.min}" max="${item.max}"
          step="${item.step}" value="${item.nilai}" />
      </label>
      <input type="range" id="${item.id}Range" min="${item.min}" max="${item.max}"
        step="${item.step}" value="${item.nilai}" />
    </div>`,
  );
  formBox.innerHTML = output.join("");

  // Sinkronkan kolom angka <-> slider
  daftarParameter.forEach((item) => {
    const angka = document.getElementById(item.id);
    const slider = document.getElementById(`${item.id}Range`);
    angka.addEventListener("input", () => {
      slider.value = angka.value;
      render();
    });
    slider.addEventListener("input", () => {
      angka.value = slider.value;
      render();
    });
  });
}

// ---------- Tombol skenario (bawaan + buatan sendiri) ----------
function buildSkenario() {
  const daftar = semuaSkenario();

  const output = daftar.map((s, i) => {
    const tombolHapus = s.bawaan
      ? ""
      : `<button class="chip-hapus" data-hapus="${s.indexSaya}" title="Hapus skenario ini">×</button>`;
    return `<span class="chip-grup">
      <button class="chip" data-index="${i}">${escapeHtml(s.nama)}</button>
      ${tombolHapus}
    </span>`;
  });
  skenarioBox.innerHTML = output.join("");

  // Klik nama skenario -> isi parameter
  skenarioBox.querySelectorAll(".chip").forEach((tombol) => {
    tombol.addEventListener("click", () => {
      setParameter(daftar[Number(tombol.dataset.index)]);
      hasilOptimasi = null;
      render();
    });
  });

  // Klik × -> hapus skenario buatan sendiri
  skenarioBox.querySelectorAll(".chip-hapus").forEach((tombol) => {
    tombol.addEventListener("click", () => {
      hapusSkenarioSaya(Number(tombol.dataset.hapus));
      buildSkenario();
    });
  });
}

// ---------- Baca & isi parameter ----------
function bacaParameter() {
  const p = {};
  daftarParameter.forEach((item) => {
    p[item.id] = Number(document.getElementById(item.id).value);
  });
  return p;
}

function setParameter(data) {
  const idValid = daftarParameter.map((item) => item.id);
  for (const key in data) {
    if (!idValid.includes(key)) continue; // abaikan key lain, misal "nama"
    document.getElementById(key).value = data[key];
    document.getElementById(`${key}Range`).value = data[key];
  }
}

// ---------- Grafik ----------
const chart = new Chart(document.getElementById("chart"), {
  type: "line",
  data: { datasets: [] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: { type: "linear", title: { display: true, text: "Waktu (t)" } },
      y: { title: { display: true, text: "Populasi P(t)" }, beginAtZero: true },
    },
    plugins: { legend: { position: "bottom" } },
  },
});

function render() {
  const parameter = bacaParameter();
  const galat = validasiParameter(parameter);
  if (galat) {
    tampilError(galat);
    return;
  }
  const { P0, r, K, T } = parameter;
  const hasil = simulate(P0, r, K, T);

  // map: ubah dua array jadi titik {x, y}
  const titikNumerik = hasil.t.map((t, i) => ({ x: t, y: hasil.P[i] }));

  // chaining: filter (ambil tiap titik ke-5) lalu map (hitung analitik)
  const titikAnalitik = hasil.t
    .filter((_, i) => i % 5 === 0)
    .map((t) => ({ x: t, y: analytic(P0, r, K, t) }));

  // kurva perbandingan yang tersimpan
  const kurvaBanding = kurvaTersimpan.map((k) => ({
    label: k.label,
    data: k.titik,
    borderColor: k.warna,
    borderWidth: 1.8,
    pointRadius: 0,
  }));

  const dataset = [
    { label: "Numerik (RK4)", data: titikNumerik, borderColor: "#1f7a63", borderWidth: 2.5, pointRadius: 0 },
    { label: "Analitik", data: titikAnalitik, borderColor: "#2f5d9e", showLine: false, pointRadius: 3, pointStyle: "rectRot" },
    { label: "Daya dukung K", data: [{ x: 0, y: K }, { x: T, y: K }], borderColor: "#9aa9a5", borderDash: [6, 6], pointRadius: 0, borderWidth: 1.5 },
    ...kurvaBanding,
  ];

  let pesan = `Selisih maksimum numerik vs analitik: <strong>${selisihMaks(P0, r, K, hasil).toExponential(2)}</strong>`;
  pesan += `<br>Kurva perbandingan: <strong>${kurvaTersimpan.length}</strong> dari ${MAKS_KURVA}`;

  if (hasilOptimasi) {
    const o = simulate(P0, hasilOptimasi.r, K, T);
    dataset.push({
      label: `r optimal = ${hasilOptimasi.r.toFixed(4)}`,
      data: o.t.map((t, i) => ({ x: t, y: o.P[i] })),
      borderColor: "#c9831a",
      borderWidth: 2.5,
      pointRadius: 0,
    });
    dataset.push({
      label: "Titik target",
      data: [{ x: hasilOptimasi.tTarget, y: hasilOptimasi.pTarget }],
      borderColor: "#c9831a",
      backgroundColor: "#c9831a",
      showLine: false,
      pointRadius: 7,
    });
    pesan += `<br>r optimal: <strong>${hasilOptimasi.r.toFixed(4)}</strong> (galat di titik target: ${hasilOptimasi.error.toFixed(4)})`;
  }

  chart.data.datasets = dataset;
  chart.update();
  infoBox.innerHTML = pesan;
}

// ---------- Perbandingan beberapa skenario (overlay) ----------
document.getElementById("btnTambahKurva").addEventListener("click", () => {
  const parameter = bacaParameter();
  const galat = validasiParameter(parameter);
  if (galat) {
    tampilError(galat);
    return;
  }
  if (kurvaTersimpan.length >= MAKS_KURVA) {
    tampilError(`Maksimal ${MAKS_KURVA} kurva perbandingan. Hapus dulu sebagian.`);
    return;
  }

  const { P0, r, K, T } = parameter;
  const hasil = simulate(P0, r, K, T);
  kurvaTersimpan.push({
    label: `P₀=${P0}, r=${r}, K=${K}`,
    titik: hasil.t.map((t, i) => ({ x: t, y: hasil.P[i] })),
    warna: warnaKurva[kurvaTersimpan.length % warnaKurva.length],
  });
  render();
});

document.getElementById("btnHapusKurva").addEventListener("click", () => {
  kurvaTersimpan = [];
  render();
});

// ---------- Simpan skenario sendiri ----------
document.getElementById("btnSimpanSkenario").addEventListener("click", () => {
  const nama = namaSkenarioInput.value.trim();
  if (nama === "") {
    tampilError("Isi nama skenario dulu.");
    return;
  }
  const parameter = bacaParameter();
  const galat = validasiParameter(parameter);
  if (galat) {
    tampilError(galat);
    return;
  }

  tambahSkenarioSaya(nama, parameter);
  namaSkenarioInput.value = "";
  buildSkenario();
  infoBox.innerHTML = `Skenario <strong>${escapeHtml(nama)}</strong> tersimpan di browser ini.`;
});

// ---------- Tombol optimasi ----------
document.getElementById("btnOpt").addEventListener("click", () => {
  const { P0, K } = bacaParameter();
  const args = {
    P0,
    K,
    pTarget: Number(document.getElementById("pTarget").value),
    tTarget: Number(document.getElementById("tTarget").value),
    rMin: Number(document.getElementById("rMin").value),
    rMax: Number(document.getElementById("rMax").value),
  };

  if (args.pTarget <= P0 || args.pTarget >= K) {
    tampilError("Populasi target harus di antara P₀ dan K.");
    return;
  }
  if (args.rMin >= args.rMax || args.tTarget <= 0) {
    tampilError("Cek lagi batas r dan waktu target.");
    return;
  }

  const hasil = optimizeR(args);
  hasilOptimasi = { ...hasil, pTarget: args.pTarget, tTarget: args.tTarget };
  render();
});

document.getElementById("btnClear").addEventListener("click", () => {
  hasilOptimasi = null;
  render();
});

// ---------- Simpan & muat parameter pakai JSON ----------
document.getElementById("btnSimpan").addEventListener("click", () => {
  // object -> teks JSON
  jsonBox.value = JSON.stringify(bacaParameter(), null, 2);
});

document.getElementById("btnMuat").addEventListener("click", () => {
  try {
    // teks JSON -> object
    const data = JSON.parse(jsonBox.value);
    setParameter(data);
    hasilOptimasi = null;
    render();
  } catch (e) {
    tampilError("Teks JSON tidak valid. Key harus pakai tanda kutip ganda, dan tidak boleh ada koma di akhir.");
  }
});

// ---------- Jalankan ----------
tampilRumus();
buildForm();
buildSkenario();
render();
