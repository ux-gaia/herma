import type { HermaAPI } from './index'

declare global {
  interface Window {
    herma: HermaAPI
  }
}

export {}
