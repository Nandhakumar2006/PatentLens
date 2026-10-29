import api from './api'

export const adminApi = {
  overview: () => api.get('/admin/overview').then((r) => r.data),
  
  // User management
  users: (page = 1, pageSize = 20) =>
    api.get('/admin/users', { params: { page, page_size: pageSize } }).then((r) => r.data),
  updateRole: (userId, role) =>
    api.patch(`/admin/users/${userId}/role`, { role }).then((r) => r.data),
  updateStatus: (userId, isActive) =>
    api.patch(`/admin/users/${userId}/status`, { is_active: isActive }).then((r) => r.data),

  // Patent management
  patents: (page = 1, pageSize = 20, q = '') =>
    api.get('/admin/patents', { params: { page, page_size: pageSize, q: q || undefined } }).then((r) => r.data),
  deletePatent: (patentId) =>
    api.delete(`/admin/patents/${patentId}`).then((r) => r.data),
  createSinglePatent: (payload) =>
    api.post('/admin/patents/single', payload).then((r) => r.data),

  // Ingestion
  downloadTemplate: () =>
    api.get('/admin/ingest/template', { responseType: 'blob' }).then((res) => {
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'patentlens_standard_template.csv'
      link.click()
      URL.revokeObjectURL(url)
    }),
  validateCsv: (file) => {
    const data = new FormData()
    data.append('file', file)
    return api.post('/admin/ingest/validate-csv', data).then((r) => r.data)
  },
  processCsv: (file) => {
    const data = new FormData()
    data.append('file', file)
    return api.post('/admin/ingest/process-csv', data).then((r) => r.data)
  },

  // Index management
  rebuildIndex: () => api.post('/admin/index/rebuild').then((r) => r.data),

  // Analytics
  globalSearches: (page = 1, pageSize = 20) =>
    api.get('/admin/analytics/searches', { params: { page, page_size: pageSize } }).then((r) => r.data),
}
