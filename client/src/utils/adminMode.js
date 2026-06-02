const ADMIN_TOKEN_KEY = "adminToken";
const ADMIN_MAIN_SITE_MODE_KEY = "cwAdminMainSiteMode";

function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage failures.
  }
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore localStorage failures.
  }
}

export function getAdminToken() {
  return getStorageItem(ADMIN_TOKEN_KEY);
}

export function isAdminMainSiteMode() {
  return getStorageItem(ADMIN_MAIN_SITE_MODE_KEY) === "true" && Boolean(getAdminToken());
}

export function enableAdminMainSiteMode() {
  setStorageItem(ADMIN_MAIN_SITE_MODE_KEY, "true");
}

export function clearAdminMainSiteMode() {
  removeStorageItem(ADMIN_MAIN_SITE_MODE_KEY);
}

