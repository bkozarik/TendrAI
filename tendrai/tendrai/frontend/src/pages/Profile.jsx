import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../components/AuthContext'
import { companiesApi } from '../api/client'
import styles from './Profile.module.css'

const CATEGORIES = ['Stavebnictví','IT služby','Úklid','Projektování','Doprava','Energetika','Zdravotnictví','Vzdělávání']
const REGIONS = ['Praha','Jihomoravský','Moravskoslezský','Středočeský','Plzeňský','Olomoucký','Jihočeský','Královéhradecký']

export default function Profile() {
  const { company } = useAuth()
  const [form, setForm] = useState({
    name: company?.name || '',
    employee_count: company?.employee_count || '',
    annual_revenue_czk: company?.annual_revenue_czk || '',
    regions: company?.regions || [],
    categories: company?.categories || [],
    notify_email: company?.notify_email ?? true,
    notify_telegram: company?.notify_telegram ?? false,
    telegram_chat_id: company?.telegram_chat_id || '',
  })
  const [saved, setSaved] = useState(false)

  const toggle = (field, val) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val]
    }))
  }

  const submit = async e => {
    e.preventDefault()
    await companiesApi.updateProfile({
      ...form,
      employee_count: parseInt(form.employee_count) || undefined,
      annual_revenue_czk: parseFloat(form.annual_revenue_czk) || undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <Sidebar />
      <main style={{flex:1, padding:'28px 32px', maxWidth:720}}>
        <h1 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Profil firmy</h1>
        <form onSubmit={submit} className={styles.form}>

          <div className="card">
            <div className={styles.sectionTitle}>Základní informace</div>
            <div className={styles.grid2}>
              <label>IČO
                <input type="text" value={company?.ico} disabled style={{opacity:.5}} />
              </label>
              <label>Počet zaměstnanců
                <input type="number" value={form.employee_count} onChange={e => setForm({...form, employee_count: e.target.value})} />
              </label>
              <label style={{gridColumn:'1/-1'}}>Název firmy
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </label>
              <label>Roční obrat (Kč)
                <input type="number" value={form.annual_revenue_czk} onChange={e => setForm({...form, annual_revenue_czk: e.target.value})} placeholder="5000000" />
              </label>
            </div>
          </div>

          <div className="card">
            <div className={styles.sectionTitle}>Kategorie zakázek</div>
            <div className={styles.chips}>
              {CATEGORIES.map(c => (
                <button type="button" key={c}
                  className={`${styles.chip} ${form.categories.includes(c) ? styles.chipActive : ''}`}
                  onClick={() => toggle('categories', c)}>{c}</button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className={styles.sectionTitle}>Regiony</div>
            <div className={styles.chips}>
              {REGIONS.map(r => (
                <button type="button" key={r}
                  className={`${styles.chip} ${form.regions.includes(r) ? styles.chipActive : ''}`}
                  onClick={() => toggle('regions', r)}>{r}</button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className={styles.sectionTitle}>Upozornění</div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={form.notify_email} onChange={e => setForm({...form, notify_email: e.target.checked})} />
              E-mail upozornění
            </label>
            <label className={styles.toggle} style={{marginTop:10}}>
              <input type="checkbox" checked={form.notify_telegram} onChange={e => setForm({...form, notify_telegram: e.target.checked})} />
              Telegram upozornění
            </label>
            {form.notify_telegram && (
              <label style={{marginTop:12,display:'flex',flexDirection:'column',gap:5,fontSize:13,color:'var(--gray-600)'}}>
                Telegram Chat ID
                <input type="text" value={form.telegram_chat_id} onChange={e => setForm({...form, telegram_chat_id: e.target.value})} placeholder="123456789" />
              </label>
            )}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button type="submit" className="btn btn-primary">Uložit změny</button>
            {saved && <span style={{fontSize:13,color:'var(--green)'}}>✓ Uloženo</span>}
          </div>
        </form>
      </main>
    </div>
  )
}
