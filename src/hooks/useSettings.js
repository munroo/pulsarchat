import { useState } from "react";

const KEY = "pulsarchat_settings";

const DEFAULTS = {
  tabTitle: true,
  sounds: false,
  autoDelete: false,
  compact: false,
  timestamps: true,
};

export function useSettings() {
  const [settings, setSettingsState] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
    } catch {}
    return { ...DEFAULTS };
  });

  function setSetting(key, value) {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return { settings, setSetting };
}
