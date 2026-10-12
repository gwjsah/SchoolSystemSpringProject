import axios from 'axios'

const TOKEN_KEY = 'sms_token'

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

/**
 * Shared Axios instance for every backend call.
 * baseURL is relative: the Vite dev server proxies /api to http://localhost:8080/api.
 */
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 (missing, invalid or expired token) log out and go to the login page.
// The login request itself is skipped so a wrong password just shows an error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const isLoginCall = error.config?.url?.includes('/auth/login')
    if (status === 401 && !isLoginCall) {
      tokenStorage.clear()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login?expired=1')
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Turns an Axios error into a readable message.
 * The backend's GlobalExceptionHandler returns { status, error, message }.
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) {
    return 'Cannot reach the server. Is the backend running on port 8080?'
  }
  return error.response.data?.message || fallback
}

export default api

