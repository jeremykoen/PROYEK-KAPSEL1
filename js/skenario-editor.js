(() => {
  "use strict";

  const STORAGE_KEY = "simulator-populasi-skenario-kustom-v1";

  let opsi = null;
  let skenarioKustom = [];

  function bacaSkenarioKustom() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Gagal membaca skenario kustom:", error);
      return [];
    }
  }

  function simpanSkenarioKustom() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(skenarioKustom));
    } catch (error) {
      console.warn("Gagal menyimpan skenario kustom:", error);
    }
  }

  function semuaSkenario() {
    const bawaan = Array.isArray(window.SKENARIO_BAWAAN)
      ? window.SKENARIO_BAWAAN
      : [];

    return [
      ...bawaan.map((item) => ({ ...item, tipe: "bawaan" })),
      ...skenarioKustom.map((item) => ({ ...item, tipe: "kustom" })),
    ];
  }

  function setStatus(teks, isError = false) {
    const status = document.getElementById("statusSkenario");
    if (!status) return;

    status.textContent = teks;
    status.style.color = isError ? "crimson" : "";
  }

  function render() {
    const box = document.getElementById("skenarioBox");
    if (!box) return;

    const daftar = semuaSkenario();

    box.innerHTML = `
      <div class="baris-input">
        <label for="pilihSkenario">
          Pilih skenario
          <select id="pilihSkenario">
            ${daftar
              .map(
                (s) =>
                  `<option value="${String(s.id)}">${escapeHtml(s.nama)}${
                    s.tipe === "kustom" ? " (kustom)" : ""
                  }</option>`,
              )
              .join("")}
          </select>
        </label>
      </div>

      <div class="aksi-skenario">
        <button type="button" id="btnPakaiSkenario" class="tombol tombol-utama">
          Pakai skenario
        </button>
        <button type="button" id="btnHapusSkenarioKustom" class="tombol">
          Hapus skenario kustom
        </button>
      </div>

      <p id="statusSkenario" aria-live="polite"></p>
    `;

    document
      .getElementById("btnPakaiSkenario")
      .addEventListener("click", terapkanPilihan);

    document
      .getElementById("btnHapusSkenarioKustom")
      .addEventListener("click", hapusPilihanKustom);
  }

  function escapeHtml(teks) {
    return String(teks)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPilihan() {
    const select = document.getElementById("pilihSkenario");
    if (!select) return null;

    return semuaSkenario().find((s) => String(s.id) === select.value) || null;
  }

  function terapkanPilihan() {
    const pilihan = getPilihan();

    if (!pilihan) {
      setStatus("Skenario tidak ditemukan.", true);
      return;
    }

    if (typeof opsi?.onPilih === "function") {
      opsi.onPilih({
        P0: pilihan.P0,
        r: pilihan.r,
        K: pilihan.K,
        T: pilihan.T,
      });
    }

    setStatus(`Skenario "${pilihan.nama}" diterapkan.`);
  }

  function simpanBaru() {
    try {
      const inputNama = document.getElementById("namaSkenario");
      const nama = inputNama?.value.trim();

      if (!nama) {
        setStatus("Isi nama skenario terlebih dahulu.", true);
        return;
      }

      if (typeof opsi?.getParameter !== "function") {
        setStatus("Parameter belum siap.", true);
        return;
      }

      const parameter = opsi.getParameter();
      window.ModelLogistik.validasiParameter(parameter);

      const item = {
        id: `kustom-${Date.now()}`,
        nama,
        ...parameter,
      };

      skenarioKustom.push(item);
      simpanSkenarioKustom();
      render();

      const select = document.getElementById("pilihSkenario");
      if (select) select.value = item.id;

      if (inputNama) inputNama.value = "";
      setStatus(`Skenario "${nama}" disimpan.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function hapusPilihanKustom() {
    const pilihan = getPilihan();

    if (!pilihan) {
      setStatus("Skenario tidak ditemukan.", true);
      return;
    }

    if (pilihan.tipe !== "kustom") {
      setStatus("Skenario bawaan tidak dapat dihapus.", true);
      return;
    }

    skenarioKustom = skenarioKustom.filter(
      (item) => String(item.id) !== String(pilihan.id),
    );

    simpanSkenarioKustom();
    render();
    setStatus("Skenario kustom dihapus.");
  }

  function init(config) {
    opsi = config || {};
    skenarioKustom = bacaSkenarioKustom();

    render();

    const btnSimpan = document.getElementById("btnSimpanSkenario");
    if (btnSimpan) {
      btnSimpan.addEventListener("click", simpanBaru);
    }
  }

  window.SkenarioEditor = {
    init,
  };
})();
