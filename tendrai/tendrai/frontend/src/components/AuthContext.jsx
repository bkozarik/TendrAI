import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authApi.me()
        .then(r => setCompany(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const r = await authApi.login(email, password)
    localStorage.setItem('token', r.data.token)
    setCompany(r.data.company)
    const me = await authApi.me()
    setCompany(me.data)
    return r.data
  }

  const register = async (data) => {
    const r = await authApi.register(data)
    localStorage.setItem('token', r.data.token)
    const me = await authApi.me()
    setCompany(me.data)
    return r.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setCompany(null)
  }

  return (
    <AuthContext.Provider value={{ company, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
