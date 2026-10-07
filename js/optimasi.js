// ================= OPTIMASI (Optimization Engineer) =================
// Tujuan: cari r supaya populasi pada waktu tTarget sedekat mungkin dengan pTarget.
// Fungsi objektif: J(r) = (P(tTarget; r) - pTarget)^2

// Populasi di akhir simulasi
function populasiAkhir(P0, r, K, T) {
  const hasil = simulate(P0, r, K, T);
  return hasil.P[hasil.P.length - 1];
}

function optimizeR({ P0, K, tTarget, pTarget, rMin, rMax }) {
  const J = (r) => (populasiAkhir(P0, r, K, tTarget) - pTarget) ** 2;

  // Tahap 1: grid search kasar (100 kandidat r)
  const N = 100;
  const langkah = (rMax - rMin) / N;
  const kandidat = Array.from({ length: N + 1 }, (_, i) => rMin + i * langkah);

  let terbaik = rMin;
  let jTerbaik = Infinity;
  for (const r of kandidat) {
    const j = J(r);
    if (j < jTerbaik) {
      jTerbaik = j;
      terbaik = r;
    }
  }

  // Tahap 2: golden-section search di sekitar kandidat terbaik
  let a = Math.max(rMin, terbaik - langkah);
  let b = Math.min(rMax, terbaik + langkah);
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);

  for (let i = 0; i < 40; i++) {
    if (J(c) < J(d)) {
      b = d;
    } else {
      a = c;
    }
    c = b - g * (b - a);
    d = a + g * (b - a);
  }

  const r = (a + b) / 2;
  return { r, error: Math.sqrt(J(r)) };
}
