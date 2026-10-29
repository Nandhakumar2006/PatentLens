import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('patentlens_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('patentlens_token')
    }
    const detail = error.response?.data?.detail
    const message = typeof detail === 'string' ? detail : error.message
    return Promise.reject(new Error(message || 'Request failed'))
  },
)

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
}

export const searchApi = {
  create: (payload) => api.post('/search', payload).then((r) => r.data),
  history: (page = 1) => api.get('/search/history', { params: { page } }).then((r) => r.data),
  detail: (id) => api.get(`/search/history/${id}`).then((r) => r.data),
  remove: (id) => api.delete(`/search/history/${id}`).then((r) => r.data),
  stats: () => api.get('/search/stats').then((r) => r.data),
}

export const patentApi = {
  get: (id) => api.get(`/patents/${id}`).then((r) => r.data),
  claims: (id) => api.get(`/patents/${id}/claims`).then((r) => r.data),
  saved: (page = 1) => api.get('/patents/saved', { params: { page } }).then((r) => r.data),
  save: (id) => api.post(`/patents/${id}/save`).then((r) => r.data),
  unsave: (id) => api.delete(`/patents/${id}/save`).then((r) => r.data),
}

export const analysisApi = {
  compare: (payload) => api.post('/analysis/compare', payload).then((r) => r.data),
  summarize: (payload) => api.post('/analysis/summarize', payload).then((r) => r.data),
}

export const documentApi = {
  extract: (file) => {
    const data = new FormData()
    data.append('file', file)
    return api.post('/documents/extract', data).then((r) => r.data)
  },
}

export const reportApi = {
  generate: (searchId) => api.post('/reports/generate', null, { params: { search_id: searchId } }).then((r) => r.data),
  list: (page = 1) => api.get('/reports', { params: { page } }).then((r) => r.data),
  download: async (id, filename) => {
    const response = await api.get(`/reports/${id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'patentlens-report.pdf'
    link.click()
    URL.revokeObjectURL(url)
  },
}

export const healthApi = {
  service: () => api.get('/health').then((r) => r.data),
  database: () => api.get('/health/database').then((r) => r.data),
  index: () => api.get('/health/index').then((r) => r.data),
  config: () => api.get('/health/config').then((r) => r.data),
}

export default api
