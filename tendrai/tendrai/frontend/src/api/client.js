import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

export const tendersApi = {
  list: (params) => api.get('/tenders/', { params }),
  get: (id) => api.get(`/tenders/${id}`),
  analyze: (id) => api.post(`/tenders/${id}/analyze`),
  save: (id) => api.post(`/tenders/${id}/save`),
  setStatus: (id, status) => api.post(`/tenders/${id}/status`, null, { params: { status } }),
  sync: () => api.post('/tenders/sync'),
}

export const notificationsApi = {
  list: () => api.get('/notifications/'),
  readAll: () => api.post('/notifications/read-all'),
}

export const companiesApi = {
  updateProfile: (data) => api.put('/companies/profile', data),
}

export default api
