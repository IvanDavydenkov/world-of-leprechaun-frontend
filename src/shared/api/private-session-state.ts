const prefix = "private:";

export function clearPrivateSessionState() {
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key);
  } catch { /* Storage может быть отключён браузером. */ }
}

export function bindPrivateSessionState(actor: string) {
  try {
    const previous = sessionStorage.getItem(`${prefix}actor`);
    if (previous !== actor) clearPrivateSessionState();
    sessionStorage.setItem(`${prefix}actor`, actor);
  } catch { /* Не препятствует авторизации. */ }
}
