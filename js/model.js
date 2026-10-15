(() => {
  "use strict";

  const MODELS = {
    exponential: {
      name: "Exponential Growth",
      formula: "dP/dt = rP",
      analytic: "P(t) = P₀ e^(rt)",
      params: [
        ["P0", "Populasi awal (P₀)", 50, 1],
        ["r", "Growth rate (r)", 0.25, 0.01],
        ["T", "Waktu simulasi (T)", 30, 1],
      ],
    },

    logistic: {
      name: "Logistic Growth",
      formula: "dP/dt = rP(1 − P/K)",
      analytic: "P(t) = K / (1 + ((K − P₀)/P₀)e^(−rt))",
      params: [
        ["P0", "Populasi awal (P₀)", 50, 1],
        ["r", "Growth rate (r)", 0.4, 0.01],
        ["K", "Carrying capacity (K)", 1000, 1],
        ["T", "Waktu simulasi (T)", 30, 1],
      ],
    },

    harvesting: {
      name: "Logistic Growth + Harvesting",
      formula: "dP/dt = rP(1 − P/K) − H",
      analytic: "Simulasi numerik RK4",
      params: [
        ["P0", "Populasi awal (P₀)", 500, 1],
        ["r", "Growth rate (r)", 0.4, 0.01],
        ["K", "Carrying capacity (K)", 1000, 1],
        ["H", "Harvesting rate (H)", 50, 1],
        ["T", "Waktu simulasi (T)", 30, 1],
      ],
    },

    predatorPrey: {
      name: "Predator–Prey (Lotka–Volterra)",
      formula: "dP/dt = αP − βPQ ; dQ/dt = γPQ − δQ",
      analytic: "Simulasi numerik RK4",
      params: [
        ["P0", "Prey awal (P₀)", 40, 1],
        ["Q0", "Predator awal (Q₀)", 9, 1],
        ["alpha", "α — growth prey", 0.6, 0.01],
        ["beta", "β — predasi", 0.025, 0.001],
        ["gamma", "γ — growth predator", 0.015, 0.001],
        ["delta", "δ — kematian predator", 0.5, 0.01],
        ["T", "Waktu simulasi (T)", 40, 1],
      ],
    },
  };

  function definition(id) {
    if (!MODELS[id]) throw new Error("Model tidak dikenal.");
    return MODELS[id];
  }

  function defaults(id) {
    return Object.fromEntries(
      definition(id).params.map(([key, _label, value]) => [key, value]),
    );
  }

  function validate(id, input) {
    const out = {};

    for (const [key, label] of definition(id).params) {
      const value = Number(input[key]);
      if (!Number.isFinite(value)) throw new Error(`${label} harus berupa angka.`);
      if (value < 0) throw new Error(`${label} tidak boleh negatif.`);
      out[key] = value;
    }

    if (out.P0 <= 0) throw new Error("Populasi awal harus lebih dari 0.");
    if ("Q0" in out && out.Q0 <= 0) throw new Error("Predator awal harus lebih dari 0.");
    if ("K" in out && out.K <= 0) throw new Error("K harus lebih dari 0.");
    if (out.T <= 0) throw new Error("T harus lebih dari 0.");

    return out;
  }

  function logisticValue(t, p) {
    const A = (p.K - p.P0) / p.P0;
    return p.K / (1 + A * Math.exp(-p.r * t));
  }

  function rk4Scalar(y, t, h, f) {
    const k1 = f(t, y);
    const k2 = f(t + h / 2, y + h * k1 / 2);
    const k3 = f(t + h / 2, y + h * k2 / 2);
    const k4 = f(t + h, y + h * k3);
    return y + h * (k1 + 2*k2 + 2*k3 + k4) / 6;
  }

  function rk4Pair(P, Q, t, h, f) {
    const k1 = f(t, P, Q);
    const k2 = f(t+h/2, P+h*k1.dP/2, Q+h*k1.dQ/2);
    const k3 = f(t+h/2, P+h*k2.dP/2, Q+h*k2.dQ/2);
    const k4 = f(t+h, P+h*k3.dP, Q+h*k3.dQ);

    return {
      P: P + h*(k1.dP + 2*k2.dP + 2*k3.dP + k4.dP)/6,
      Q: Q + h*(k1.dQ + 2*k2.dQ + 2*k3.dQ + k4.dQ)/6,
    };
  }

  function simulate(id, input, points = 240) {
    const p = validate(id, input);
    const n = Math.max(40, Math.min(1000, points));
    const h = p.T / n;

    if (id === "exponential") {
      const data = [];
      for (let i=0; i<=n; i++) {
        const t = i*h;
        data.push({x:t, y:p.P0*Math.exp(p.r*t)});
      }
      return [{label:"Populasi", data}];
    }

    if (id === "logistic") {
      const data = [];
      for (let i=0; i<=n; i++) {
        const t = i*h;
        data.push({x:t, y:logisticValue(t,p)});
      }
      return [{label:"Populasi", data}];
    }

    if (id === "harvesting") {
      const data = [{x:0, y:p.P0}];
      let P = p.P0;
      let t = 0;
      const f = (_t, y) => p.r*y*(1-y/p.K)-p.H;

      for (let i=1; i<=n; i++) {
        P = Math.max(0, rk4Scalar(P,t,h,f));
        t = i*h;
        data.push({x:t,y:P});
      }
      return [{label:"Populasi", data}];
    }

    if (id === "predatorPrey") {
      const prey = [{x:0,y:p.P0}];
      const predator = [{x:0,y:p.Q0}];
      let P = p.P0, Q = p.Q0, t = 0;

      const f = (_t, preyValue, predatorValue) => ({
        dP: p.alpha*preyValue - p.beta*preyValue*predatorValue,
        dQ: p.gamma*preyValue*predatorValue - p.delta*predatorValue,
      });

      for (let i=1; i<=n; i++) {
        const next = rk4Pair(P,Q,t,h,f);
        P = Math.max(0,next.P);
        Q = Math.max(0,next.Q);
        t = i*h;
        prey.push({x:t,y:P});
        predator.push({x:t,y:Q});
      }

      return [
        {label:"Prey", data:prey},
        {label:"Predator", data:predator},
      ];
    }

    throw new Error("Model belum tersedia.");
  }

  window.ModelPopulasi = {
    models: MODELS,
    definition,
    defaults,
    validate,
    simulate,
  };

  // Supaya optimasi.js lama tetap jalan untuk Logistic Growth.
  window.ModelLogistik = {
    validasiParameter(parameter) {
      return validate("logistic", parameter);
    },

    populasiLogistik(t, P0, r, K) {
      return logisticValue(t, {P0, r, K});
    },

    buatDataPopulasi(parameter, jumlahTitik = 240) {
      return simulate("logistic", parameter, jumlahTitik)[0].data;
    },
  };
})();
