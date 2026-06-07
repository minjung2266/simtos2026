import { SurveyScore } from '../types'

interface Props {
  value: SurveyScore
  onChange: (v: SurveyScore) => void
  disabled?: boolean
}

const LABELS = ['전혀\n아니다', '아니다', '보통', '그렇다', '매우\n그렇다']

export default function ScoreSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="score-selector">
      {([1, 2, 3, 4, 5] as SurveyScore[]).map((score) => (
        <button
          key={score}
          type="button"
          className={`score-btn ${value === score ? 'active' : ''}`}
          onClick={() => !disabled && onChange(value === score ? null : score)}
          disabled={disabled}
        >
          <span className="score-num">{score}</span>
          <span className="score-label">{LABELS[score! - 1]}</span>
        </button>
      ))}
    </div>
  )
}
