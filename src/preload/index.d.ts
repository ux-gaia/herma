import type { SheeterAPI } from './index'

declare global {
  interface Window {
    sheeter: SheeterAPI
  }
}

export {}
