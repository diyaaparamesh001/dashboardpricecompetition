/*
 * Sample data for the price competition dashboard.
 * Replace this file (or populate `window.DASHBOARD_DATA` from an API)
 * to drive the dashboard with real numbers.
 */
window.DASHBOARD_DATA = {
  user: {
    name: "Johnathan Samuel",
    lastUpdated: "6 Nov, 6:00 AM",
  },

  sites: [
    { id: "amazon", name: "amazon.in", initial: "A", color: "#3fbfa3", matched: 4, priceChanges: 2, index: 102 },
    { id: "croma", name: "croma.com", initial: "C", color: "#e8956a", matched: 3, priceChanges: 1, index: 108 },
    { id: "flipkart", name: "flipkart.com", initial: "F", color: "#e5707a", matched: 3, priceChanges: 2, index: 103 },
  ],

  overview: {
    priceChanges: { increased: 2, decreased: 3 },
    outOfStock: { myStore: 1, competitors: 4 },
    index: { value: 104, change: 2 },
  },

  // `competitors` are prices on amazon.in, croma.com and flipkart.com.
  // `suggestion` is the recommended next price.
  products: [
    {
      id: 12450,
      name: "Wireless over-ear headphones",
      brand: "SoundCore",
      category: "Audio",
      price: 1299,
      margin: 17.6,
      competitors: { amazon: 1199, croma: 1249, flipkart: 1349 },
      suggestion: 1239,
    },
    {
      id: 12462,
      name: "Portable Bluetooth speaker 20W",
      brand: "SoundCore",
      category: "Audio",
      price: 2499,
      margin: 20.5,
      competitors: { amazon: 2549, croma: 2599, flipkart: 2649 },
      suggestion: 2529,
    },
    {
      id: 12471,
      name: "Smartwatch with 1.8-inch display",
      brand: "Pulse",
      category: "Wearables",
      price: 3999,
      margin: 18.7,
      competitors: { amazon: 3499, croma: 3599, flipkart: 3749 },
      suggestion: 3449,
    },
    {
      id: 12488,
      name: "USB-C fast charger 65W",
      brand: "VoltEdge",
      category: "Accessories",
      price: 1099,
      margin: 19.9,
      competitors: { amazon: 999, croma: 1149, flipkart: 1199 },
      suggestion: 989,
    },
    {
      id: 12493,
      name: "Wired earphones with mic",
      brand: "SoundCore",
      category: "Audio",
      price: 499,
      margin: 22.4,
      competitors: { amazon: 502, croma: 504, flipkart: 507 },
      suggestion: 501,
    },
    {
      id: 12501,
      name: "Power bank 10000mAh",
      brand: "VoltEdge",
      category: "Accessories",
      price: 1499,
      margin: 15.2,
      competitors: { amazon: 1479, croma: 1509, flipkart: 1519 },
      suggestion: 1469,
    },
    {
      id: 12514,
      name: "Wireless optical mouse",
      brand: "VoltEdge",
      category: "Accessories",
      price: 799,
      margin: 24.1,
      competitors: { amazon: 785, croma: 805, flipkart: 815 },
      suggestion: 779,
    },
    {
      id: 12522,
      name: "Mechanical keyboard, blue switches",
      brand: "VoltEdge",
      category: "Accessories",
      price: 2999,
      margin: 16.8,
      competitors: { amazon: 2989, croma: 3049, flipkart: 3079 },
      suggestion: 2979,
    },
    {
      id: 12537,
      name: "Full HD 1080p webcam",
      brand: "Pulse",
      category: "Wearables",
      price: 1899,
      margin: 14.9,
      competitors: { amazon: 1879, croma: 1929, flipkart: 1949 },
      suggestion: 1869,
    },
    {
      id: 12546,
      name: "Aluminium laptop stand",
      brand: "Pulse",
      category: "Accessories",
      price: 1149,
      margin: 21.3,
      competitors: { amazon: 1099, croma: 1129, flipkart: 1179 },
      suggestion: 1119,
    },
  ],

  // Daily index per site (100 = same as the average competitor price).
  // The last 7 points match the design; longer ranges are generated in app.js.
  history: {
    endDate: "2026-11-06",
    week: {
      amazon: [99.1, 100.0, 98.2, 100.9, 100.8, 101.9, 102],
      croma: [104.0, 105.8, 105.0, 106.8, 105.6, 107.9, 108],
      flipkart: [101.2, 102.0, 102.8, 102.4, 103.0, 102.2, 103],
    },
  },
};
