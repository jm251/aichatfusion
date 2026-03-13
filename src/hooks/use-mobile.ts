import { useEffect, useState } from "react"

const BREAKPOINTS = {
  '2xs': 320,
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
} as const

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < BREAKPOINTS.md)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<keyof typeof BREAKPOINTS>('2xs')

  useEffect(() => {
    const getBreakpoint = (): keyof typeof BREAKPOINTS => {
      const width = window.innerWidth
      if (width >= BREAKPOINTS['3xl']) return '3xl'
      if (width >= BREAKPOINTS['2xl']) return '2xl'
      if (width >= BREAKPOINTS.xl) return 'xl'
      if (width >= BREAKPOINTS.lg) return 'lg'
      if (width >= BREAKPOINTS.md) return 'md'
      if (width >= BREAKPOINTS.sm) return 'sm'
      if (width >= BREAKPOINTS.xs) return 'xs'
      return '2xs'
    }

    const handleResize = () => {
      setBreakpoint(getBreakpoint())
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}

export function useIsTouch() {
  const [isTouch, setIsTouch] = useState<boolean>(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    
    checkTouch()
    
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const handleChange = () => checkTouch()
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isTouch
}
