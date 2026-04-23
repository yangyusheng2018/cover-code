import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

let accessToken: string | null = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

const raw = axios.create({
  baseURL,
  withCredentials: true,
})

export const http: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshing = false
const waitQueue: Array<(token: string | null) => void> = []

async function refreshAccessToken(): Promise<string | null> {
  const { data } = await raw.post<{
    accessToken?: string
    expiresIn?: number
  }>('/api/auth/refresh')
  const next = data.accessToken ?? null
  setAccessToken(next)
  return next
}

/** 仅用 Cookie 中的 refresh_token 换新 access（不附带 Authorization），供冷启动预刷新 */
export async function tryRefreshSession(): Promise<string | null> {
  try {
    return await refreshAccessToken()
  } catch {
    return null
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (status !== 401 || original.url?.includes('/api/auth/refresh')) {
      return Promise.reject(error)
    }
    if (original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    if (refreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push((token) => {
          if (!token) {
            reject(error)
            return
          }
          original.headers.Authorization = `Bearer ${token}`
          resolve(http(original))
        })
      })
    }

    refreshing = true
    try {
      const token = await refreshAccessToken()
      waitQueue.forEach((fn) => fn(token))
      waitQueue.length = 0
      if (!token) {
        return Promise.reject(error)
      }
      original.headers.Authorization = `Bearer ${token}`
      return http(original)
    } catch (e) {
      waitQueue.forEach((fn) => fn(null))
      waitQueue.length = 0
      return Promise.reject(e)
    } finally {
      refreshing = false
    }
  },
)
