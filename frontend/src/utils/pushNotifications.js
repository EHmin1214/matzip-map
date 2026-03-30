import axios from "axios";
import { API_BASE } from "../context/UserContext";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export async function subscribePush(userId) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const { data } = await axios.get(`${API_BASE}/push/vapid-key`);
  if (!data.public_key) return false;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.public_key),
  });

  const json = sub.toJSON();
  await axios.post(`${API_BASE}/push/subscribe`, {
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });

  return true;
}

export async function unsubscribePush(userId) {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) await sub.unsubscribe();
    await axios.delete(`${API_BASE}/push/unsubscribe?user_id=${userId}`);
  } catch (e) {}
}

export async function isPushSubscribed() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
