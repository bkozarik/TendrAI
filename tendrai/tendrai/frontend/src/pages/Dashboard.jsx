import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { tendersApi, notificationsApi } from '../api/client'
import { useAuth } from '../components/AuthContext'
import styles from './Dashboard.module.css'

const CATEGORIES = ['Stavebnictví', 'IT služby', 'Úklid', 'Projektování', 'Doprava', 'Energetika']
const REGIONS = ['Praha', 'Jihomoravský', 'Moravskoslezský', 'Středočeský', 'Plzeňský', 'Olomoucký']

function scoreColor(s) {
  if (s >= 75) return 'score-high'
  if (s >= 50) return 'score-mid'
  return 'score-low'
}

function fmtValue(v) {
  if (!v) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kč`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K Kč`
  return `${Math.round(v)} Kč`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Dashboard() {
  const { company } = useAuth()
  const navigate = useNavigate()
  const [tenders, setTenders] = useState([])
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState({ total: 0, saved: 0, applied: 0 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [q, setQ] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [activeRegion, setActiveRegion] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, nRes] = await Promise.all([
        tendersApi.list({ q, category: activeCategory, region: activeRegion, limit: 20 }),
        notificationsApi.list()
      ])
      setTenders(tRes.data.items || [])
      setStats({ total: tRes.data.total || 0, saved: 0, applied: 0 })
      setNotifications(nRes.data.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [q, activeCategory, activeRegion])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true)
    try { await tendersApi.sync() } catch (e) {}
    setTimeout(() => { setSyncing(false); load() }, 2000)
  }

  const handleSave = async (e, id) => {
    e.stopPropagation()
    await tendersApi.save(id)
    load()
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.title}>Přehled zakázek</h1>
            <p className={styles.sub}>Vítejte, {company?.name}</p>
          </div>
          <div className={styles.topActions}>
            {unread > 0 && (
              <button className={`btn btn-outline ${styles.notifBtn}`} onClick={() => notificationsApi.readAll().then(load)}>
                🔔 {unread} nových
              </button>
            )}
            <button className="btn btn-outline" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Synchronizuji…' : '↻ Synchronizovat'}
            </button>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Dostupné zakázky</div>
            <div className={styles.statVal}>{stats.total}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Nová upozornění</div>
            <div className={styles.statVal}>{unread}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Váš profil</div>
            <div className={styles.statVal}>{(company?.categories || []).length} kategorií</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Zaměstnanci</div>
            <div className={styles.statVal}>{company?.employee_count || '—'}</div>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className={`card ${styles.notifPanel}`}>
            <div className={styles.sectionTitle}>Upozornění</div>
            {notifications.slice(0, 4).map(n => (
              <div key={n.id} className={`${styles.notif} ${!n.is_read ? styles.notifUnread : ''}`}>
                <span className={`${styles.notifDot} ${n.type === 'new_match' ? styles.dotGreen : n.type === 'deadline' ? styles.dotAmber : styles.dotBlue}`} />
                <span className={styles.notifText}>{n.message}</span>
                <span className={styles.notifTime}>{fmtDate(n.created_at)}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.filters}>
          <input
            className={styles.search}
            type="text"
            placeholder="Hledat zakázky…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className={styles.pills}>
            {CATEGORIES.map(c => (
              <button
                key={c}
                className={`${styles.pill} ${activeCategory === c ? styles.pillActive : ''}`}
                onClick={() => setActiveCategory(activeCategory === c ? '' : c)}
              >{c}</button>
            ))}
          </div>
          <div className={styles.pills}>
            {REGIONS.map(r => (
              <button
                key={r}
                className={`${styles.pill} ${activeRegion === r ? styles.pillActive : ''}`}
                onClick={() => setActiveRegion(activeRegion === r ? '' : r)}
              >{r}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.empty}>Načítám zakázky…</div>
        ) : tenders.length === 0 ? (
          <div className={styles.empty}>
            <p>Žádné zakázky nenalezeny.</p>
            <button className="btn btn-primary" style={{marginTop:12}} onClick={handleSync}>
              Synchronizovat z NIPEZ
            </button>
          </div>
        ) : (
          <div className={styles.list}>
            {tenders.map(t => (
              <div
                key={t.id}
                className={`card ${styles.tenderCard} ${t.is_saved ? styles.saved : ''}`}
                onClick={() => navigate(`/tender/${t.id}`)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardLeft}>
                    <div className={styles.cardTitle}>{t.title}</div>
                    <div className={styles.cardMeta}>
                      {t.contracting_authority} · {fmtDate(t.deadline)} · {fmtValue(t.value_czk)}
                    </div>
                    <div className={styles.cardBadges}>
                      {t.cpv_name && <span className="badge badge-green">{t.cpv_name.slice(0, 30)}</span>}
                      {t.region && <span className="badge badge-gray">{t.region}</span>}
                      {t.procedure_type && <span className="badge badge-blue">{t.procedure_type}</span>}
                      {t.status && <span className="badge badge-amber">{t.status}</span>}
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    {t.ai_score != null && (
                      <div className={styles.score}>
                        <span className={`${styles.scoreNum} ${scoreColor(t.ai_score)}`}>{Math.round(t.ai_score)}%</span>
                        <span className={styles.scoreLabel}>AI shoda</span>
                        <div className={styles.scoreBar}>
                          <div className={styles.scoreFill} style={{
                            width: `${t.ai_score}%`,
                            background: t.ai_score >= 75 ? 'var(--green)' : t.ai_score >= 50 ? 'var(--amber)' : '#E24B4A'
                          }} />
                        </div>
                      </div>
                    )}
                    <button
                      className={`btn btn-outline ${styles.saveBtn}`}
                      onClick={e => handleSave(e, t.id)}
                    >
                      {t.is_saved ? '★' : '☆'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
