import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    const sparkApp = document.getElementById("spark-app")
    const body = document.body

    // Remove existing theme classes
    root.classList.remove("light", "dark")
    sparkApp?.classList.remove("light-theme", "dark-theme")
    body.classList.remove("light", "dark")
    root.removeAttribute("data-appearance")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      body.classList.add(systemTheme)
      sparkApp?.classList.add(systemTheme === "dark" ? "dark-theme" : "light-theme")
      document.documentElement.setAttribute("data-theme", systemTheme)
      document.documentElement.setAttribute("data-appearance", systemTheme)
      return
    }

    root.classList.add(theme)
    body.classList.add(theme)
    sparkApp?.classList.add(theme === "dark" ? "dark-theme" : "light-theme")
    document.documentElement.setAttribute("data-theme", theme)
    document.documentElement.setAttribute("data-appearance", theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
