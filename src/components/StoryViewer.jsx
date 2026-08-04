import { useEffect, useRef, useState } from 'react'

const MESSAGE_DURATION_MS = 5000
const QUIZ_RESULT_DELAY_MS = 1600
const SWIPE_THRESHOLD_PX = 40

/**
 * Storie façon Instagram / WhatsApp : barre de progression segmentée, avance
 * automatique, navigation par tap (zones gauche/droite) ou par swipe. `items`
 * mélange des slides système ('ticket', 'documents' — construits par ClientPage
 * à partir du ticket en cours) et les promotions actives de l'organisation
 * ('message', 'quiz'). En mode `fullscreen`, prend toute la page (position fixe).
 */
export default function StoryViewer({
  items,
  orgName,
  orgLogo,
  orgPrimary,
  orgSecondary,
  ticket,
  checkedDocs,
  onToggleDoc,
  fullscreen,
  footer,
  alert,
}) {
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  // Pause manuelle et persistante (bouton ⏸, clavier/lecteur d'écran) — distincte de
  // `paused` qui ne dure que le temps d'un appui maintenu. Sans elle, un défilement
  // automatique de contenu (>5s, WCAG 2.2.2) n'aurait aucun mécanisme de pause
  // découvrable pour qui ne peut pas faire d'appui maintenu au doigt.
  const [pausedByUser, setPausedByUser] = useState(false)
  const [answers, setAnswers] = useState({}) // { [promotionId]: optionIndex }
  const bodyRef = useRef(null)
  const dragRef = useRef(null)

  const current = items[index]
  const isQuiz = current?.type === 'quiz'
  const answeredIndex = current ? answers[current.id] : undefined
  const hasAnswered = answeredIndex !== undefined
  // Un message d'alerte (sonnette) se pose par-dessus la storie sans la faire
  // disparaître : on met juste le défilement automatique en pause pendant que
  // l'agent appelle, le temps que le client lise l'alerte.
  const effectivelyPaused = paused || pausedByUser || !!alert

  const goTo = (next) => {
    if (items.length === 0) return
    setIndex(((next % items.length) + items.length) % items.length)
    setProgress(0)
  }

  // Réinitialise la progression à chaque changement de slide.
  useEffect(() => setProgress(0), [index])

  // Avance automatique : la plupart des slides après MESSAGE_DURATION_MS, quiz
  // seulement une fois répondu (laisse le temps de lire la question et de répondre).
  useEffect(() => {
    if (!current || effectivelyPaused) return
    if (isQuiz && !hasAnswered) return // on attend une réponse avant de faire défiler

    const duration = isQuiz ? QUIZ_RESULT_DELAY_MS : MESSAGE_DURATION_MS
    const start = performance.now() - (progress / 100) * duration
    const tick = () => {
      const elapsed = performance.now() - start
      const pct = Math.min(100, (elapsed / duration) * 100)
      setProgress(pct)
      if (pct >= 100) {
        goTo(index + 1)
      }
    }
    const id = setInterval(tick, 50)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, effectivelyPaused, isQuiz, hasAnswered, items.length])

  function onPointerDown(e) {
    dragRef.current = { x: e.clientX, t: Date.now() }
    setPaused(true)
  }

  function onPointerUp(e) {
    setPaused(false)
    if (!dragRef.current || !bodyRef.current) return
    const deltaX = e.clientX - dragRef.current.x
    dragRef.current = null

    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
      goTo(index + (deltaX < 0 ? 1 : -1))
      return
    }
    // Simple tap : zone gauche = précédent, zone droite = suivant.
    const rect = bodyRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    goTo(index + (ratio < 0.3 ? -1 : 1))
  }

  function answer(optionIndex) {
    if (hasAnswered) return
    setAnswers((a) => ({ ...a, [current.id]: optionIndex }))
    setProgress(0)
  }

  if (!current) return null

  const rootStyle = {
    '--org-primary': orgPrimary,
    '--org-secondary': orgSecondary,
    background: 'linear-gradient(150deg, var(--org-primary), color-mix(in srgb, var(--org-primary) 55%, var(--org-secondary)))',
  }

  return (
    <div className={`story-viewer ${fullscreen ? 'story-viewer--fullscreen' : ''}`} style={rootStyle}>
      <div className="story-progress">
        {items.map((item, i) => (
          <div className="story-progress-track" key={item.id}>
            <div
              className="story-progress-fill"
              style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }}
            />
          </div>
        ))}
      </div>

      <div className="story-header">
        <span className="story-avatar">{orgLogo ? <img src={orgLogo} alt="" /> : (orgName || 'T').slice(0, 1)}</span>
        <span className="story-org-name">{orgName}</span>
        <span className="story-time">à l’instant</span>
        <button
          type="button"
          className="story-pause-btn"
          onClick={() => setPausedByUser((p) => !p)}
          aria-label={pausedByUser ? 'Reprendre le défilement automatique' : 'Mettre en pause le défilement automatique'}
        >
          {pausedByUser ? '▶' : '⏸'}
        </button>
      </div>

      {/* Code, rang et attente restent visibles sur TOUTES les slides (pas seulement
          la slide "ticket") : le client ne doit jamais perdre ces infos en swipant
          vers une promo ou un quiz. */}
      {ticket?.code && (
        <div className="story-sticky-info" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <span>🎫 {ticket.code}</span>
          <span className="story-sticky-dot">•</span>
          <span>{ticket.position ?? 0} devant vous</span>
          <span className="story-sticky-dot">•</span>
          <span>~{ticket.attente_estimee_min ?? 0} min</span>
        </div>
      )}

      {alert && (
        <div className="story-alert" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <span className="story-alert-icon">🔔</span>
          <div>
            <div className="story-alert-title">{alert.title}</div>
            {alert.body && <div className="story-alert-body">{alert.body}</div>}
          </div>
        </div>
      )}

      <div
        className="story-body"
        ref={bodyRef}
        role="group"
        aria-label={`Diapositive ${index + 1} sur ${items.length}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => dragRef.current && setPaused(false)}
      >
        {/* Équivalent clavier/lecteur d'écran des zones de tap gauche/droite : de vrais
            boutons plutôt qu'un gestionnaire de touches sur le conteneur, pour rester
            utilisables aussi par les technologies d'assistance qui interceptent le tap. */}
        <button
          type="button"
          className="story-nav-btn story-nav-btn--prev"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); goTo(index - 1) }}
          aria-label="Diapositive précédente"
        >
          ‹
        </button>
        <button
          type="button"
          className="story-nav-btn story-nav-btn--next"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); goTo(index + 1) }}
          aria-label="Diapositive suivante"
        >
          ›
        </button>
        {current.type === 'ticket' && <TicketSlide ticket={ticket} />}
        {current.type === 'documents' && <DocumentsSlide ticket={ticket} checked={checkedDocs} onToggle={onToggleDoc} />}
        {current.type === 'message' && <MessageSlide promo={current} />}
        {current.type === 'quiz' && <QuizSlide promo={current} answeredIndex={answeredIndex} onAnswer={answer} />}
      </div>

      {footer && (
        <div className="story-footer" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          {footer}
        </div>
      )}
    </div>
  )
}

function TicketSlide({ ticket }) {
  return (
    <div className="story-slide">
      <div className="story-slide-badge">{ticket.service_nom}</div>
      <div className="story-ticket-code">{ticket.code}</div>
      <div className="story-ticket-stats">
        <div>
          <div className="story-ticket-stat-value">{ticket.position}</div>
          <div className="story-ticket-stat-label">personne(s) devant vous</div>
        </div>
        <div>
          <div className="story-ticket-stat-value">~{ticket.attente_estimee_min} min</div>
          <div className="story-ticket-stat-label">attente estimée</div>
        </div>
      </div>
    </div>
  )
}

function DocumentsSlide({ ticket, checked, onToggle }) {
  return (
    <div className="story-slide">
      <div className="story-slide-badge">📋 Documents à préparer</div>
      <div className="story-documents-list">
        {ticket.documents_requis.map((doc) => (
          <label
            key={doc}
            className="story-doc-item"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <input type="checkbox" checked={!!checked[doc]} onChange={() => onToggle(doc)} />
            {doc}
          </label>
        ))}
      </div>
    </div>
  )
}

function MessageSlide({ promo }) {
  return (
    <div className="story-slide">
      <div className="story-slide-badge">{promo.titre}</div>
      <p className="story-slide-text">{promo.texte}</p>
    </div>
  )
}

function QuizSlide({ promo, answeredIndex, onAnswer }) {
  const hasAnswered = answeredIndex !== undefined
  return (
    <div className="story-slide">
      <div className="story-slide-badge">{promo.titre}</div>
      <p className="story-slide-text story-slide-question">{promo.texte}</p>
      <div className="story-quiz-options">
        {promo.options.map((opt, i) => {
          let state = ''
          if (hasAnswered) {
            if (opt.correcte) state = 'correct'
            else if (i === answeredIndex) state = 'incorrect'
            else state = 'dimmed'
          }
          return (
            <button
              key={opt.texte}
              type="button"
              className={`story-quiz-option ${state}`}
              disabled={hasAnswered}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onAnswer(i)
              }}
            >
              {opt.texte}
              {state === 'correct' && ' ✓'}
              {state === 'incorrect' && ' ✕'}
            </button>
          )
        })}
      </div>
      {hasAnswered && (
        <p className="story-quiz-feedback">
          {promo.options[answeredIndex]?.correcte ? 'Bonne réponse ! 🎉' : 'Pas tout à fait, mais bien tenté !'}
        </p>
      )}
    </div>
  )
}
