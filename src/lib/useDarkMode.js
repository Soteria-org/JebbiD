"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "jbd-theme";

function readInitialTheme() {
  if (typeof document === "undefined") return "light";
  // app/layout.js already set this attribute before hydration (see
  // THEME_INIT_SCRIPT), so reading it back keeps this hook in sync with
  // whatever the pre-hydration script decided instead of guessing again.
  return document.documentElement.getAttribute("data-theme") || "light";
}

/**
 * Single source of truth for the app's dark/light mode. Reads the value the
 * inline boot script already applied to <html data-theme>, then lets any
 * screen (Header toggle, Profile settings toggle) flip it — writing both the
 * DOM attribute and localStorage so the choice survives reloads.
 */
export function useDarkMode() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    setTheme(readInitialTheme());
  }, []);

  function setThemeValue(next) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // localStorage can throw in private-browsing/quota-exceeded edge cases;
      // the theme still applies for this session via the DOM attribute.
    }
  }

  function toggle() {
    setThemeValue(theme === "dark" ? "light" : "dark");
  }

  return { theme, isDark: theme === "dark", toggle, setTheme: setThemeValue };
}
