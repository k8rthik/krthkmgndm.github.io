// Three stylised ERCOT days, on the hour, Central time.
//
// Load and capacity-factor shapes follow ERCOT's published daily patterns; the
// summer day is anchored to the 22 July 2026 record (91.1 GW peak load at 18:00
// CT) and to the 2026 solar record of 34,737 MW.

const S = (a) => Float64Array.from(a);

export const DAYS = {
  summer: {
    id: "summer",
    label: "Summer peak evening",
    note: "A tight one. Anchored to 22 Jul 2026: 91.1 GW system peak at 18:00 CT, solar near its 34.7 GW record. Prices are made in the 19:00-21:00 ramp, after the solar fleet sets.",
    peakLoad: 91100,
    thermalDerate: 0.87,          // ambient derate at ~100 F plus forced outages
    load: S([0.74,0.71,0.69,0.68,0.68,0.70,0.73,0.75,0.77,0.80,0.84,0.88,0.91,0.94,0.96,0.98,0.99,1.00,1.00,0.99,0.97,0.93,0.87,0.80]),
    solar: S([0,0,0,0,0,0.01,0.09,0.30,0.53,0.70,0.80,0.85,0.87,0.88,0.87,0.85,0.82,0.79,0.73,0.48,0.12,0,0,0]),
    windWest: S([0.42,0.44,0.45,0.45,0.44,0.42,0.38,0.32,0.26,0.21,0.17,0.15,0.14,0.14,0.15,0.17,0.20,0.24,0.29,0.35,0.39,0.41,0.42,0.42]),
    windCoast: S([0.30,0.28,0.26,0.24,0.23,0.23,0.25,0.28,0.32,0.36,0.40,0.45,0.50,0.55,0.59,0.62,0.63,0.62,0.58,0.52,0.45,0.39,0.35,0.32]),
  },
  spring: {
    id: "spring",
    label: "Mild spring day",
    note: "The surplus case: low load, strong wind and solar together. This is when ERCOT prints negative prices and curtails.",
    peakLoad: 57000,
    thermalDerate: 0.88,          // shoulder-season maintenance outages
    load: S([0.78,0.75,0.73,0.72,0.72,0.74,0.78,0.80,0.79,0.77,0.75,0.74,0.73,0.73,0.74,0.76,0.79,0.84,0.92,1.00,0.99,0.94,0.88,0.82]),
    solar: S([0,0,0,0,0.01,0.06,0.22,0.46,0.66,0.80,0.88,0.93,0.95,0.95,0.93,0.90,0.85,0.77,0.62,0.32,0.05,0,0,0]),
    windWest: S([0.66,0.68,0.70,0.71,0.71,0.70,0.66,0.60,0.53,0.47,0.43,0.41,0.41,0.42,0.44,0.47,0.51,0.56,0.61,0.65,0.67,0.67,0.67,0.66]),
    windCoast: S([0.48,0.46,0.44,0.42,0.41,0.41,0.43,0.47,0.52,0.57,0.62,0.66,0.70,0.73,0.75,0.76,0.75,0.72,0.67,0.61,0.56,0.53,0.51,0.49]),
  },
  winter: {
    id: "winter",
    label: "Winter morning event",
    note: "A cold snap: a long morning ramp, almost no solar, and gas capacity derated for freeze and fuel outages.",
    peakLoad: 80500,
    thermalDerate: 0.80,          // freeze-related forced outages and fuel curtailment
    load: S([0.88,0.90,0.92,0.94,0.96,0.99,1.00,1.00,0.97,0.92,0.87,0.83,0.80,0.79,0.79,0.81,0.85,0.90,0.94,0.95,0.94,0.93,0.91,0.89]),
    solar: S([0,0,0,0,0,0,0,0.05,0.26,0.45,0.57,0.64,0.66,0.65,0.61,0.53,0.38,0.13,0,0,0,0,0,0]),
    windWest: S([0.31,0.30,0.29,0.28,0.26,0.24,0.22,0.20,0.19,0.18,0.18,0.19,0.20,0.22,0.24,0.26,0.28,0.30,0.32,0.34,0.35,0.35,0.34,0.32]),
    windCoast: S([0.22,0.21,0.20,0.19,0.18,0.17,0.16,0.16,0.17,0.18,0.20,0.22,0.24,0.26,0.28,0.29,0.30,0.30,0.29,0.28,0.26,0.25,0.24,0.23]),
  },
};

export const DAY_IDS = ["summer", "spring", "winter"];
