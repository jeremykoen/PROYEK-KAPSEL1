(() => {
  "use strict";

  function cariROptimal({
    P0,
    K,
    pTarget,
    tTarget,
    rMin,
    rMax,
    maxIterasi = 100,
    toleransi = 1e-10,
  }) {
    P0 = Number(P0);
    K = Number(K);
    pTarget = Number(pTarget);
    tTarget = Number(tTarget);
    rMin = Number(rMin);
    rMax = Number(rMax);

    const semuaAngka = [P0, K, pTarget, tTarget, rMin, rMax];
    if (!semuaAngka.every(Number.isFinite)) {
      throw new Error("Semua parameter optimasi harus berupa angka.");
    }

    if (P0 <= 0) throw new Error("P0 harus lebih dari 0.");
    if (K <= 0) throw new Error("K harus lebih dari 0.");
    if (pTarget <= 0) throw new Error("Populasi target harus lebih dari 0.");
    if (tTarget <= 0) throw new Error("Waktu target harus lebih dari 0.");
    if (rMin < 0 || rMax < 0) throw new Error("r minimum dan maksimum tidak boleh negatif.");
    if (rMin >= rMax) throw new Error("r minimum harus lebih kecil dari r maksimum.");

    const hitung = (r) =>
      window.ModelLogistik.populasiLogistik(tTarget, P0, r, K);

    const pMin = hitung(rMin);
    const pMax = hitung(rMax);

    const kandidatBatas = [
      { r: rMin, p: pMin, error: Math.abs(pMin - pTarget) },
      { r: rMax, p: pMax, error: Math.abs(pMax - pTarget) },
    ];

    const nilaiRendah = Math.min(pMin, pMax);
    const nilaiTinggi = Math.max(pMin, pMax);
    const targetDalamRentang =
      pTarget >= nilaiRendah && pTarget <= nilaiTinggi;

    if (!targetDalamRentang) {
      kandidatBatas.sort((a, b) => a.error - b.error);
      const terbaik = kandidatBatas[0];

      return {
        rOptimal: terbaik.r,
        populasiHasil: terbaik.p,
        error: terbaik.error,
        targetDalamRentang: false,
        iterasi: 0,
      };
    }

    const naikTerhadapR = pMax >= pMin;
    let kiri = rMin;
    let kanan = rMax;
    let tengah = (kiri + kanan) / 2;
    let populasiTengah = hitung(tengah);
    let iterasi = 0;

    for (iterasi = 1; iterasi <= maxIterasi; iterasi++) {
      tengah = (kiri + kanan) / 2;
      populasiTengah = hitung(tengah);

      const error = Math.abs(populasiTengah - pTarget);
      if (error <= toleransi || Math.abs(kanan - kiri) <= toleransi) {
        break;
      }

      if (naikTerhadapR) {
        if (populasiTengah < pTarget) {
          kiri = tengah;
        } else {
          kanan = tengah;
        }
      } else {
        if (populasiTengah > pTarget) {
          kiri = tengah;
        } else {
          kanan = tengah;
        }
      }
    }

    return {
      rOptimal: tengah,
      populasiHasil: populasiTengah,
      error: Math.abs(populasiTengah - pTarget),
      targetDalamRentang: true,
      iterasi,
    };
  }

  window.OptimasiPopulasi = {
    cariROptimal,
  };
})();
