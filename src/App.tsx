import { useState, useCallback, useEffect, useRef } from 'react'

const LOGS_STORAGE_KEY = 'card-game-logs'

type Role = 'a' | 'b' | 'distractor'

type Card = {
  id: string
  pairId: number
  role: Role
  keyword: string
  isOpen: boolean
  isMatched: boolean
}

const FIXED_PAIRS = [
  { a: '성장', b: '육성' },
  { a: '협업', b: '시너지' },
  { a: '소통', b: '인정' },
  { a: '존중', b: '배려' },
  { a: '격려', b: '칭찬' },
] as const

const DISTRACTORS = ['신뢰', '교육'] as const

function buildCards(): Card[] {
  const cards: Card[] = []
  FIXED_PAIRS.forEach((p, pairId) => {
    cards.push({
      id: `pair-${pairId}-a`,
      pairId,
      role: 'a',
      keyword: p.a,
      isOpen: false,
      isMatched: false,
    })
    cards.push({
      id: `pair-${pairId}-b`,
      pairId,
      role: 'b',
      keyword: p.b,
      isOpen: false,
      isMatched: false,
    })
  })
  DISTRACTORS.forEach((keyword, i) => {
    cards.push({
      id: `distractor-${i}`,
      pairId: -1,
      role: 'distractor',
      keyword,
      isOpen: false,
      isMatched: false,
    })
  })
  return cards
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function checkMatch(first: Card, second: Card): boolean {
  if (first.role === 'distractor' || second.role === 'distractor') return false
  return (
    first.role === 'a' &&
    second.role === 'b' &&
    first.pairId === second.pairId
  )
}

export type GameLog = {
  사번: string
  이름: string
  시간초: number
  시도횟수: number
  완료일시: string
}

function loadLogs(): GameLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GameLog[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLog(log: GameLog) {
  const logs = loadLogs()
  logs.push(log)
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs))
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [사번, set사번] = useState('')
  const [이름, setName] = useState('')
  const [cards, setCards] = useState<Card[]>(() => shuffle(buildCards()))
  const [attempts, setAttempts] = useState(0)
  const [matches, setMatches] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lock, setLock] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showLogs, setShowLogs] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const [finalAttempts, setFinalAttempts] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  const startGame = useCallback(() => {
    setCards(shuffle(buildCards()))
    setAttempts(0)
    setMatches(0)
    setSelectedIds([])
    setLock(false)
    setElapsedSeconds(0)
    elapsedRef.current = 0
    setGameOver(false)
    setGameStarted(true)
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => {
        elapsedRef.current = s + 1
        return s + 1
      })
    }, 1000)
  }, [])

  const goHome = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setGameStarted(false)
    setShowLogs(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleStartClick = () => {
    const id = 사번.trim()
    const name = 이름.trim()
    if (!id || !name) {
      alert('사번과 이름을 입력해 주세요.')
      return
    }
    startGame()
  }

  const handleCardClick = (card: Card) => {
    if (lock || gameOver) return
    if (card.isOpen || card.isMatched) return
    const ids = [...selectedIds, card.id]
    setSelectedIds(ids)

    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, isOpen: true } : c))
    )

    if (ids.length < 2) return

    setAttempts((a) => a + 1)
    const first = cards.find((c) => c.id === ids[0])
    const second = card
    if (!first) return

    if (checkMatch(first, second)) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === first.id || c.id === second.id
            ? { ...c, isMatched: true, isOpen: true }
            : c
        )
      )
      const newMatches = matches + 1
      setMatches(newMatches)
      setSelectedIds([])

      if (newMatches === 5) {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        const totalAttempts = attempts + 1
        const totalTime = elapsedRef.current
        setFinalTime(totalTime)
        setFinalAttempts(totalAttempts)
        setGameOver(true)
        saveLog({
          사번: 사번.trim(),
          이름: 이름.trim(),
          시간초: totalTime,
          시도횟수: totalAttempts,
          완료일시: new Date().toLocaleString('ko-KR'),
        })
      }
      return
    }

    setLock(true)
    setTimeout(() => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === first.id || c.id === second.id
            ? { ...c, isOpen: false }
            : c
        )
      )
      setSelectedIds([])
      setLock(false)
    }, 700)
  }

  const logs = loadLogs()

  if (!gameStarted) {
    return (
      <div className="app">
        <div className="start-screen">
          <h1>카드 뒤집기 매칭</h1>
          <p className="start-desc">사번과 이름을 입력한 뒤 도전을 눌러 주세요.</p>
          <div className="start-form">
            <label>
              사번
              <input
                type="text"
                value={사번}
                onChange={(e) => set사번(e.target.value)}
                placeholder="사번 입력"
              />
            </label>
            <label>
              이름
              <input
                type="text"
                value={이름}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
              />
            </label>
            <button type="button" className="btn-challenge" onClick={handleStartClick}>
              도전
            </button>
          </div>

          <div className="admin-logs">
            <button
              type="button"
              className="btn-logs-toggle"
              onClick={() => setShowLogs((v) => !v)}
            >
              {showLogs ? '결과 로그 접기' : '관리자: 결과 로그 보기'}
            </button>
            {showLogs && (
              <div className="logs-panel">
                <h2>참가 결과 로그 (우승 판정용)</h2>
                {logs.length === 0 ? (
                  <p className="logs-empty">기록이 없습니다.</p>
                ) : (
                  <div className="logs-table-wrap">
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>사번</th>
                          <th>이름</th>
                          <th>시간</th>
                          <th>시도 횟수</th>
                          <th>완료 일시</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log, i) => (
                          <tr key={i}>
                            <td>{log.사번}</td>
                            <td>{log.이름}</td>
                            <td>{formatTime(log.시간초)}</td>
                            <td>{log.시도횟수}</td>
                            <td>{log.완료일시}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>카드 뒤집기 매칭</h1>
        <div className="stats">
          <span>시간: {formatTime(elapsedSeconds)}</span>
          <span>시도: {attempts}</span>
          <span>매칭: {matches} / 5</span>
        </div>
      </header>

      <main className="game">
        {gameOver && (
          <div className="win-overlay" role="alert">
            <p>완료! 5쌍을 모두 맞추었습니다.</p>
            <p>시간: {formatTime(finalTime)} · 시도: {finalAttempts}회</p>
            <button type="button" className="btn-home" onClick={goHome}>
              처음으로
            </button>
          </div>
        )}
        <div className="grid grid-4x3">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="card-wrap"
              disabled={card.isMatched || lock}
              onClick={() => handleCardClick(card)}
              aria-label={
                card.isOpen || card.isMatched
                  ? `${card.keyword} (매칭됨)`
                  : '카드 뒤집기'
              }
            >
              <div
                className={`card-inner ${card.isOpen || card.isMatched ? 'flipped' : ''}`}
              >
                <div className="card-face card-back">?</div>
                <div className="card-face card-front">{card.keyword}</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
