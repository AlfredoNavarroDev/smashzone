import { createContext, useContext } from 'react'
import type { GlassShape } from './glass-mosaic-geometry'
export const GlassContext = createContext<Record<string, GlassShape>>({})
export const useGlassShape = (id: string) => useContext(GlassContext)[id]
