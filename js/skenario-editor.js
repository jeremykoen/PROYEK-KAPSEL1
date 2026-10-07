// ================= EDITOR SKENARIO (Frontend) =================
// Pola sama seperti addquestions.js di proyek quiz:
// simpan ke localStorage dengan JSON.stringify, baca lagi dengan JSON.parse.

const KUNCI_STORAGE = "skenarioSaya";

// Baca skenario buatan sendiri (teks JSON -> array object)
function ambilSkenarioSaya() {
  try {
    const data = JSON.parse(localStorage.getItem(KUNCI_STORAGE));
    return data ? data : [];
  } catch (e) {
    return []; // data rusak atau localStorage tidak tersedia
  }
}

// Simpan (array object -> teks JSON)
function simpanSkenarioSaya(daftar) {
  localStorage.setItem(KUNCI_STORAGE, JSON.stringify(daftar));
}

// Tambah satu skenario: { nama, P0, r, K, T }
function tambahSkenarioSaya(nama, parameter) {
  const daftar = ambilSkenarioSaya();
  daftar.push({ nama, ...parameter });
  simpanSkenarioSaya(daftar);
}

// Hapus skenario buatan sendiri berdasarkan urutannya
function hapusSkenarioSaya(index) {
  const daftar = ambilSkenarioSaya().filter((_, i) => i !== index);
  simpanSkenarioSaya(daftar);
}

// Gabungan skenario bawaan (skenario.js) + buatan sendiri
function semuaSkenario() {
  const bawaan = skenario.map((s) => ({ ...s, bawaan: true }));
  const saya = ambilSkenarioSaya().map((s, i) => ({
    ...s,
    bawaan: false,
    indexSaya: i,
  }));
  return [...bawaan, ...saya];
}
