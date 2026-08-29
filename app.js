const MODULES = {
  dashboard: { title: "Ana Panel", url: "" },
  "arac-kabul": { title: "Araç Kabul", url: "/modules/arac-kabul/index.html" },
  stok: { title: "Genel Stok", url: "/modules/stok/index.html" },
  "ekran-cerceve": { title: "Ekran & Çerçeve", url: "/modules/ekran-cerceve/index.html" },
  "avans-maas": { title: "Avans & Maaş", url: "/modules/avans-maas/index.html" },
  anket: { title: "Müşteri Memnuniyet Anketi", url: "/modules/anket/index.html" }
};
const VAPID_PUBLIC_KEY = "BAi5RqXIHt50gvHTCOLT0XJxzW6f8OB_pYt_JN4nOKIIP8Cj9KkUu44hsLRZKLxxOKrZVdPFX_c5qc141bJt4Hc";

const dashboard = document.getElementById("dashboard");
const viewport = document.getElementById("moduleViewport");
const frame = document.getElementById("moduleFrame");
const loading = document.getElementById("moduleLoading");
const title = document.getElementById("moduleTitle");
const refreshButton = document.getElementById("refreshModuleButton");
const openButton = document.getElementById("openModuleButton");
const toast = document.getElementById("toast");
let activeModule = "dashboard";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setActiveButton(key) {
  document.querySelectorAll(".module-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.module === key);
  });
}

function openModule(key, pushState = true) {
  const module = MODULES[key] || MODULES.dashboard;
  activeModule = MODULES[key] ? key : "dashboard";
  title.textContent = module.title;
  setActiveButton(activeModule);

  const isDashboard = activeModule === "dashboard";
  dashboard.classList.toggle("hidden", !isDashboard);
  viewport.classList.toggle("hidden", isDashboard);
  refreshButton.classList.toggle("hidden", isDashboard);
  openButton.classList.toggle("hidden", isDashboard);

  if (!isDashboard) {
    loading.classList.remove("hidden");
    if (frame.dataset.module !== activeModule) {
      frame.dataset.module = activeModule;
      frame.src = module.url;
    }
  }

  if (pushState) {
    history.replaceState(null, "", isDashboard ? location.pathname : `#${activeModule}`);
    localStorage.setItem("garageflow_active_module", activeModule);
  }
}

document.querySelectorAll(".module-button").forEach((button) => {
  button.addEventListener("click", () => openModule(button.dataset.module));
});
document.querySelectorAll("[data-open-module]").forEach((button) => {
  button.addEventListener("click", () => openModule(button.dataset.openModule));
});
document.querySelectorAll("[data-open-payroll]").forEach((button) => {
  button.addEventListener("click", () => openModule("avans-maas"));
});

frame.addEventListener("load", () => loading.classList.add("hidden"));
refreshButton.addEventListener("click", () => {
  if (!frame.src) return;
  loading.classList.remove("hidden");
  frame.contentWindow?.location.reload();
});
openButton.addEventListener("click", () => {
  const url = MODULES[activeModule]?.url;
  if (url) window.open(url, "_blank", "noopener");
});

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(base64)].map((character) => character.charCodeAt(0)));
}

document.getElementById("notificationButton").addEventListener("click", async () => {
  if (!("Notification" in window)) return showToast("Bu cihaz tarayıcı bildirimlerini desteklemiyor.");
  const result = await Notification.requestPermission();
  if (result === "granted") {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager?.getSubscription();
      if (!subscription && registration.pushManager) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
      if (subscription) {
        const response = await fetch("/api/subscribe-push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription) });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.message || "Push kaydı yapılamadı");
      }
      localStorage.setItem("garageflow_salary_notifications", "1");
      showToast("Maaş bildirimleri açıldı.");
      window.dispatchEvent(new CustomEvent("garageflow:check-payroll", { detail: { force: true } }));
    } catch (error) {
      console.warn(error);
      showToast("Bildirim izni açık; arka plan kaydı tamamlanamadı.");
    }
  } else {
    showToast("Bildirim izni verilmedi.");
  }
});

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || !event.data) return;
  if (event.data.type === "garageflow:module-title" && event.data.title) title.textContent = event.data.title;
  if (event.data.type === "garageflow:toast" && event.data.message) showToast(event.data.message);
  if (event.data.type === "garageflow:navigate" && MODULES[event.data.module]) openModule(event.data.module);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js?v=1.0.0").catch(console.warn));
}

const initialHash = location.hash.replace("#", "");
const savedModule = localStorage.getItem("garageflow_active_module");
openModule(MODULES[initialHash] ? initialHash : (MODULES[savedModule] ? savedModule : "dashboard"), false);

window.GarageFlow = { openModule, showToast };
