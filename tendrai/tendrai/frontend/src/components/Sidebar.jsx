import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/', icon: '⊞', label: 'Přehled' },
  { to: '/profile', icon: '◎', label: 'Profil firmy' },
]

export default function Sidebar() {
  const { company, logout } = useAuth()
  const navigate = useNavigate()
  const initials = company?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T'

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        Tendr<span>AI</span>
      </div>

      <nav className={styles.nav}>
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.icon}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.company}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <div className={styles.companyName}>{company?.name}</div>
            <div className={styles.ico}>IČO {company?.ico}</div>
          </div>
        </div>
        <button className={styles.logout} onClick={() => { logout(); navigate('/login') }}>
          Odhlásit
        </button>
      </div>
    </aside>
  )
}
