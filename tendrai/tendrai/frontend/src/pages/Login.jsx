import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import styles from './Auth.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Chyba přihlášení')
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.box}>
        <div className={styles.logo}>Tendr<span>AI</span></div>
        <h2 className={styles.heading}>Přihlásit se</h2>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={submit} className={styles.form}>
          <label>E-mail
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </label>
          <label>Heslo
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </label>
          <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'10px'}} disabled={loading}>
            {loading ? 'Přihlašuji…' : 'Přihlásit se'}
          </button>
        </form>
        <p className={styles.link}>Nemáte účet? <Link to="/register">Zaregistrovat firmu</Link></p>
      </div>
    </div>
  )
}
