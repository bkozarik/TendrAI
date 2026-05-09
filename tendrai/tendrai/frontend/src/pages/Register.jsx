import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import styles from './Auth.module.css'

const CATEGORIES = ['Stavebnictví','IT služby','Úklid','Projektování','Doprava','Energetika','Zdravotnictví','Vzdělávání']
const REGIONS = ['Praha','Jihomoravský','Moravskoslezský','Středočeský','Plzeňský','Olomoucký','Jihočeský','Královéhradecký']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    ico: '', name: '', email: '', password: '',
    employee_count: '', regions: [], categories: []
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggle = (field, val) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val]
    }))
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await register({ ...form, employee_count: parseInt(form.employee_count) || 1 })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Chyba registrace')
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.box} style={{maxWidth: 480}}>
        <div className={styles.logo}>Tendr<span>AI</span></div>
        <h2 className={styles.heading}>Registrace firmy</h2>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.row}>
            <label>IČO
              <input type="text" maxLength={8} value={form.ico} onChange={e => setForm({...form, ico: e.target.value})} required placeholder="12345678"/>
            </label>
            <label>Počet zaměstnanců
              <input type="number" min={1} value={form.employee_count} onChange={e => setForm({...form, employee_count: e.target.value})} placeholder="10"/>
            </label>
          </div>
          <label>Název firmy
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Novák Stavby s.r.o."/>
          </label>
          <label>E-mail
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required/>
          </label>
          <label>Heslo
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={8}/>
          </label>

          <div className={styles.groupLabel}>Kategorie zakázek (vyberte vaše obory)</div>
          <div className={styles.chips}>
            {CATEGORIES.map(c => (
              <button type="button" key={c}
                className={`${styles.chip} ${form.categories.includes(c) ? styles.chipActive : ''}`}
                onClick={() => toggle('categories', c)}>{c}</button>
            ))}
          </div>

          <div className={styles.groupLabel}>Regiony</div>
          <div className={styles.chips}>
            {REGIONS.map(r => (
              <button type="button" key={r}
                className={`${styles.chip} ${form.regions.includes(r) ? styles.chipActive : ''}`}
                onClick={() => toggle('regions', r)}>{r}</button>
            ))}
          </div>

          <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'10px', marginTop:4}} disabled={loading}>
            {loading ? 'Registruji…' : 'Vytvořit účet'}
          </button>
        </form>
        <p className={styles.link}>Máte účet? <Link to="/login">Přihlásit se</Link></p>
      </div>
    </div>
  )
}
