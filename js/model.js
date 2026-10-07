// ================= MODEL (Math & Model Engineer) =================
// Persamaan: dP/dt = r * P * (1 - P/K)

// Solusi numerik dengan metode Runge-Kutta orde 4 (RK4).
// Kontrak fungsi: simulate(P0, r, K, T, dt) -> { t: [...], P: [...] }
function simulate(P0, r, K, T, dt = 0.1) {
  const f = (P) => r * P * (1 - P / K);

  const t = [0];
  const P = [P0];
  let p = P0;
  const n = Math.round(T / dt);

  for (let i = 1; i <= n; i++) {
    const k1 = f(p);
    const k2 = f(p + (dt * k1) / 2);
    const k3 = f(p + (dt * k2) / 2);
    const k4 = f(p + dt * k3);
    p += (dt * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
    t.push(i * dt);
    P.push(p);
  }

  return { t, P };
}

// Solusi analitik (hasil turunan di kertas), dipakai untuk validasi.
const analytic = (P0, r, K, t) =>
  K / (1 + ((K - P0) / P0) * Math.exp(-r * t));

// Selisih terbesar antara solusi numerik dan analitik.
function selisihMaks(P0, r, K, hasil) {
  const selisih = hasil.t.map((t, i) =>
    Math.abs(hasil.P[i] - analytic(P0, r, K, t)),
  );
  return Math.max(...selisih);
}
