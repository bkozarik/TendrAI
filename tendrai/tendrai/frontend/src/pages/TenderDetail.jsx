import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { tendersApi } from '../api/client'
import styles from './TenderDetail.module.css'

function fmtValue(v) {
  if (!v) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kč`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K Kč`
  return `${Math.round(v)} Kč`
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}
function scoreColor(s) {
  if (s >= 75) return '#1D9E75'
  if (s >= 50) return '#EF9F27'
  return '#E24B4A'
}

export default function TenderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tendersApi.get(id).then(r => {
      setData(r.data)
      setStatus(r.data.status || '')
      if (r.data.ai_analysis) {
        try { setAnalysis(JSON.parse(r.data.ai_analysis)) } catch {}
      }
      setLoading(false)
    })
  }, [id])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const r = await tendersApi.analyze(id)
      if (r.data.analysis) {
        try { setAnalysis(JSON.parse(r.data.analysis)) } catch {}
      }
      const fresh = await tendersApi.get(id)
      setData(fresh.data)
    } catch (e) {
      alert('Chyba při analýze. Zkontrolujte ANTHROPIC_API_KEY.')
    }
    setAnalyzing(false)
  }

  const handleSave = async () => {
    await tendersApi.save(id)
    const r = await tendersApi.get(id)
    setData(r.data)
  }

  const handleStatus = async (s) => {
    await tendersApi.setStatus(id, s)
    setStatus(s)
  }

  if (loading) return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <Sidebar />
      <main style={{flex:1,padding:'40px',color:'var(--gray-400)'}}>Načítám…</main>
    </div>
  )

  const t = data?.tender
  const score = data?.ai_score

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <button className={styles.back} onClick={() => navigate('/')}>← Zpět na přehled</button>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{t?.title}</h1>
            <div className={styles.meta}>
              <span>{t?.contracting_authority}</span>
              <span>·</span>
              <span>Deadline: <strong>{fmtDate(t?.deadline)}</strong></span>
              <span>·</span>
              <span>Hodnota: <strong>{fmtValue(t?.value_czk)}</strong></span>
            </div>
          </div>
          {score != null && (
            <div className={styles.scoreBig} style={{color: scoreColor(score)}}>
              {Math.round(score)}%
              <span>AI shoda</span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className="btn btn-outline" onClick={handleSave}>
            {data?.is_saved ? '★ Uloženo' : '☆ Uložit'}
          </button>
          {['saved','applied','won','lost'].map(s => (
            <button
              key={s}
              className={`btn btn-outline ${status === s ? styles.statusActive : ''}`}
              onClick={() => handleStatus(s)}
            >
              {s === 'saved' ? 'Sledováno' : s === 'applied' ? 'Podáno' : s === 'won' ? 'Vyhráno' : 'Prohráno'}
            </button>
          ))}
          {t?.url && (
            <a href={t.url} target="_blank" rel="noreferrer" className="btn btn-outline">
              Otevřít v NIPEZ ↗
            </a>
          )}
        </div>

        <div className={styles.grid}>
          <div className={styles.col}>
            <div className="card">
              <div className={styles.cardTitle}>Detail zakázky</div>
              <table className={styles.infoTable}>
                <tbody>
                  <tr><td>Zadavatel</td><td>{t?.contracting_authority || '—'}</td></tr>
                  <tr><td>CPV kód</td><td>{t?.cpv_code} — {t?.cpv_name}</td></tr>
                  <tr><td>Kraj</td><td>{t?.region || '—'}</td></tr>
                  <tr><td>Typ řízení</td><td>{t?.procedure_type || '—'}</td></tr>
                  <tr><td>Hodnota</td><td>{fmtValue(t?.value_czk)}</td></tr>
                  <tr><td>Deadline</td><td>{fmtDate(t?.deadline)}</td></tr>
                </tbody>
              </table>
            </div>

            {t?.description && (
              <div className="card" style={{marginTop:12}}>
                <div className={styles.cardTitle}>Popis zakázky</div>
                <p className={styles.description}>{t.description}</p>
              </div>
            )}
          </div>

          <div className={styles.col}>
            {!analysis ? (
              <div className="card" style={{textAlign:'center',padding:'32px 20px'}}>
                <div style={{fontSize:32,marginBottom:12}}>✦</div>
                <div style={{fontWeight:500,marginBottom:8}}>AI analýza zakázky</div>
                <div style={{fontSize:13,color:'var(--gray-400)',marginBottom:20,lineHeight:1.6}}>
                  Claude analyzuje tuto zakázku vůči profilu vaší firmy — šance na úspěch, požadavky, rizika.
                </div>
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? '⏳ Analyzuji…' : '✦ Spustit AI analýzu'}
                </button>
              </div>
            ) : (
              <div className="card">
                <div className={styles.cardTitle}>AI analýza</div>

                <div className={styles.aiScore} style={{background: score >= 75 ? 'var(--green-light)' : score >= 50 ? 'var(--amber-light)' : '#FCEBEB'}}>
                  <span style={{fontSize:28,fontWeight:600,color: scoreColor(score)}}>{Math.round(score)}%</span>
                  <div>
                    <div style={{fontWeight:500,fontSize:13}}>{analysis.recommendation === 'apply' ? 'Doporučujeme podat nabídku' : analysis.recommendation === 'consider' ? 'Zvažte podání nabídky' : 'Nedoporučujeme'}</div>
                    <div style={{fontSize:12,color:'var(--gray-600)',marginTop:2}}>{analysis.match_reason}</div>
                  </div>
                </div>

                {analysis.requirements?.length > 0 && (
                  <div className={styles.aiSection}>
                    <div className={styles.aiSectionTitle}>Klíčové požadavky</div>
                    {analysis.requirements.map((r, i) => (
                      <div key={i} className={styles.aiItem}>
                        <span className={styles.dot} style={{background:'var(--green)'}} />
                        {r}
                      </div>
                    ))}
                  </div>
                )}

                {analysis.risks?.length > 0 && (
                  <div className={styles.aiSection}>
                    <div className={styles.aiSectionTitle}>Rizika</div>
                    {analysis.risks.map((r, i) => (
                      <div key={i} className={styles.aiItem}>
                        <span className={styles.dot} style={{background:'var(--amber)'}} />
                        {r}
                      </div>
                    ))}
                  </div>
                )}

                {analysis.cover_letter_hint && (
                  <div className={styles.aiSection}>
                    <div className={styles.aiSectionTitle}>Průvodní dopis — tip</div>
                    <div style={{fontSize:13,color:'var(--gray-600)',lineHeight:1.6}}>{analysis.cover_letter_hint}</div>
                  </div>
                )}

                <button className="btn btn-outline" style={{marginTop:12,fontSize:12}} onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? 'Analyzuji…' : '↻ Znovu analyzovat'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
