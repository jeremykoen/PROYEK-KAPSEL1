(() => {
  "use strict";

  function toNumber(value, name) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new Error(`${name} harus berupa angka yang valid.`);
    }
    return n;
  }

  function validasiParameter({ P0, r, K, T }) {
    P0 = toNumber(P0, "P0");
    r = toNumber(r, "r");
    K = toNumber(K, "K");
    T = toNumber(T, "T");

    if (P0 <= 0) throw new Error("Populasi awal (P0) harus lebih dari 0.");
    if (K <= 0) throw new Error("Carrying capacity (K) harus lebih dari 0.");
    if (r < 0) throw new Error("Growth rate (r) tidak boleh negatif.");
    if (T <= 0) throw new Error("Waktu simulasi (T) harus lebih dari 0.");

    return { P0, r, K, T };
  }

  function populasiLogistik(t, P0, r, K) {
    t = toNumber(t, "t");
    P0 = toNumber(P0, "P0");
    r = toNumber(r, "r");
    K = toNumber(K, "K");

    if (t < 0) throw new Error("Waktu (t) tidak boleh negatif.");
    if (P0 <= 0) throw new Error("P0 harus lebih dari 0.");
    if (K <= 0) throw new Error("K harus lebih dari 0.");
    if (r < 0) throw new Error("r tidak boleh negatif.");

    const A = (K - P0) / P0;
    const denominator = 1 + A * Math.exp(-r * t);

    if (Math.abs(denominator) < 1e-12) {
      throw new Error("Parameter menghasilkan nilai populasi yang tidak terdefinisi.");
    }

    return K / denominator;
  }

  function buatDataPopulasi(parameter, jumlahTitik = 240) {
    const { P0, r, K, T } = validasiParameter(parameter);

    const titik = Math.max(20, Math.min(1000, Math.floor(jumlahTitik)));
    const data = [];

    for (let i = 0; i <= titik; i++) {
      const t = (T * i) / titik;
      data.push({
        x: t,
        y: populasiLogistik(t, P0, r, K),
      });
    }

    return data;
  }

  window.ModelLogistik = {
    validasiParameter,
    populasiLogistik,
    buatDataPopulasi,
  };
})();
