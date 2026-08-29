const MODULES = {
  dashboard: { title: "Ana Panel", url: "" },
  "arac-kabul": { title: "Araç Kabul", url: "/modules/arac-kabul/index.html" },
  stok: { title: "Genel Stok", url: "/modules/stok/index.html" },
  "ekran-cerceve": { title: "Ekran & Çerçeve", url: "/modules/ekran-cerceve/index.html" },
  "avans-maas": { title: "Avans & Maaş", url: "/modules/avans-maas/index.html" },
  anket: { title: "Müşteri Memnuniyet Anketi", url: "/modules/anket/index.html" }
};
const VAPID_PUBLIC_KEY = "BAi5RqXIHt50gvHTCOLT0XJxzW6f8OB_pYt_JN4nOKIIP8Cj9KkUu44hsLRZKLxxOKrZVdPFX_c5qc141bJt4Hc";
const MAIN_SUPABASE_URL = "https://dmsovrbkoeivkvmlzals.supabase.co";
const MAIN_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtc292cmJrb2Vpdmt2bWx6YWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTg3NTMsImV4cCI6MjA5MjkzNDc1M30.Tf_8-AEkON4hvKsWiljiDV5z_LJW7KUebIkU-0R8x_A";
const authClient = window.supabase.createClient(MAIN_SUPABASE_URL, MAIN_SUPABASE_KEY);

const dashboard = document.getElementById("dashboard");
const viewport = document.getElementById("moduleViewport");
const frame = document.getElementById("moduleFrame");
const loading = document.getElementById("moduleLoading");
const title = document.getElementById("moduleTitle");
const refreshButton = document.getElementById("refreshModuleButton");
const openButton = document.getElementById("openModuleButton");
const toast = document.getElementById("toast");
let activeModule = "dashboard";
let appStarted = false;

function authEmailForUsername(username) {
  const slug = String(username || "")
    .trim().toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, ".").replace(/^\.+|\.+$/g, "");
  return `${slug || "personel"}@garage.local`;
}

function roleLabel(role) {
  return ({ admin: "Admin", depo: "Depo", kasa: "Kasa", satis: "Satış", usta: "Usta" })[role] || role || "Personel";
}

async function loadGlobalProfile() {
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData?.user) throw authError || new Error("Oturum bulunamadı");
  const { data, error } = await authClient.from("app_users").select("auth_user_id,username,name,role,is_active").eq("auth_user_id", authData.user.id).single();
  if (error) throw error;
  if (!data?.is_active) throw new Error("Bu personel hesabı pasif");
  return data;
}

function showGlobalLogin(message = "") {
  document.getElementById("globalLoginOverlay").classList.remove("hidden");
  document.getElementById("globalAppShell").classList.add("auth-locked");
  document.getElementById("globalLoginError").textContent = message;
  setTimeout(() => document.getElementById("globalLoginUsername")?.focus(), 100);
}

function enterGarageFlow(profile) {
  document.getElementById("globalLoginOverlay").classList.add("hidden");
  document.getElementById("globalAppShell").classList.remove("auth-locked");
  document.getElementById("globalUserPill").classList.remove("hidden");
  document.getElementById("globalUserName").textContent = profile.name || profile.username || "Personel";
  document.getElementById("globalUserRole").textContent = roleLabel(profile.role);
  const canSeePayroll = profile.role === "admin";
  document.querySelectorAll('[data-module="avans-maas"],[data-open-module="avans-maas"],[data-open-payroll]').forEach((element) => element.classList.toggle("hidden", !canSeePayroll));
  const initialHash = location.hash.replace("#", "");
  const savedModule = localStorage.getItem("garageflow_active_module");
  let initialModule = MODULES[initialHash] ? initialHash : (MODULES[savedModule] ? savedModule : "dashboard");
  if (!canSeePayroll && initialModule === "avans-maas") initialModule = "dashboard";
  if (!appStarted) {
    appStarted = true;
    openModule(initialModule, false);
  }
}

async function initializeGlobalAuth() {
  try {
    const { data } = await authClient.auth.getSession();
    if (!data?.session) return showGlobalLogin();
    enterGarageFlow(await loadGlobalProfile());
  } catch (error) {
    await authClient.auth.signOut({ scope: "local" }).catch(() => {});
    showGlobalLogin(error.message || "Oturum açılamadı");
  }
}

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
  if (event.data.type === "garageflow:auth-required") showGlobalLogin("Oturum süresi doldu. Tekrar giriş yap.");
});

document.getElementById("globalLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.getElementById("globalLoginUsername").value.trim();
  const password = document.getElementById("globalLoginPassword").value;
  const button = document.getElementById("globalLoginButton");
  const errorBox = document.getElementById("globalLoginError");
  if (!username || !password) { errorBox.textContent = "Kullanıcı adı ve şifre gerekli."; return; }
  button.disabled = true;
  button.textContent = "Giriş yapılıyor…";
  errorBox.textContent = "";
  try {
    const { error } = await authClient.auth.signInWithPassword({ email: authEmailForUsername(username), password });
    if (error) throw error;
    const profile = await loadGlobalProfile();
    document.getElementById("globalLoginPassword").value = "";
    enterGarageFlow(profile);
    showToast(`Hoş geldin ${profile.name || profile.username} ✅`);
  } catch (error) {
    await authClient.auth.signOut({ scope: "local" }).catch(() => {});
    errorBox.textContent = error?.message === "Invalid login credentials" ? "Kullanıcı adı veya şifre hatalı." : (error.message || "Giriş yapılamadı.");
  } finally {
    button.disabled = false;
    button.textContent = "Giriş Yap";
  }
});

document.getElementById("globalLogoutButton").addEventListener("click", async () => {
  await authClient.auth.signOut();
  frame.src = "about:blank";
  frame.dataset.module = "";
  appStarted = false;
  showGlobalLogin("Oturum kapatıldı.");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js?v=1.0.1").catch(console.warn));
}

window.GarageFlow = { openModule, showToast };
initializeGlobalAuth();
