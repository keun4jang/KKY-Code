"use client"

import { useCallback, useEffect, useState } from "react"

export type ThemePref = "light" | "dark" | "system"

function applyTheme(pref: ThemePref) {
  const isDark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", isDark)
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>("system")

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as ThemePref | null) ?? "system"
    setThemeState(saved)
    applyTheme(saved)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      const current = (localStorage.getItem("theme") as ThemePref | null) ?? "system"
      if (current === "system") applyTheme("system")
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const setTheme = useCallback((pref: ThemePref) => {
    localStorage.setItem("theme", pref)
    setThemeState(pref)
    applyTheme(pref)
  }, [])

  return { theme, setTheme }
}
