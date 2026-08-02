import { useEffect, useMemo, useRef, useState } from 'react'

const MESSAGE_DURATION_MS = 5000
const QUIZ_RESULT_DELAY_MS = 1600
const SWIPE_THRESHOLD_PX = 40

/**
 * Storie façon Instagram / WhatsApp : barre de progression segmentée, avance
 * automatique, navigation par tap (zones gauche/droite) ou par swipe, et
 * slides quiz interactifs. `items` = promotions actives de l'organisation.
 */
export default function StoryViewer({ items, orgName, orgLogo }) {
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [answers, setAnswers] = useState({}) // { [promotionId]: optionIndex }
  const bodyRef = useRef(null)
  const dragRef = useRef(null)

  const current = items[index]
  const isQuiz = current?.type === 'quiz'
  const answeredIndex = current ? answers[current.id] : undefined
  const hasAnswered = answeredIndex !== undefined

  const goTo = (next) => {
    if (items.length === 0) return
    setIndex(((next % items.length) + items.length) % items.length)
    setProgress(0)
  }

  // Réinitialise la progression à chaque changement de slide.
  useEffect(() => setProgress(0), [index])

  // Avance automatique : messages après MESSAGE_DURATION_MS, quiz seulement
  // une fois répondu (laisse le temps de lire la question et de répondre).
  useEffect(() => {
    if (!current || paused) return
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
  }, [index, paused, isQuiz, hasAnswered, items.length])

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

  const gradient = useMemo(
    () => `linear-gradient(150deg, var(--org-primary), color-mix(in srgb, var(--org-primary) 55%, var(--org-secondary)))`,
    []
  )

  if (!current) return null

  return (
    <div className="story-viewer" style={{ background: gradient }}>
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
      </div>

      <div
        className="story-body"
        ref={bodyRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => dragRef.current && setPaused(false)}
      >
        {isQuiz ? (
          <QuizSlide promo={current} answeredIndex={answeredIndex} onAnswer={answer} />
        ) : (
          <MessageSlide promo={current} />
        )}
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
