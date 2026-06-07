import XLSXStyle from 'xlsx-js-style'
import { ConsultationRecord, SURVEY_QUESTIONS } from '../types'

const SCORE_LABEL: Record<number, string> = {
  1: '전혀아니다',
  2: '아니다',
  3: '보통',
  4: '그렇다',
  5: '매우그렇다',
}

const HEADER_STYLE = {
  fill: { fgColor: { rgb: 'E8E8E8' } },
  font: { bold: true, sz: 11 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top:    { style: 'thin', color: { rgb: 'BBBBBB' } },
    bottom: { style: 'thin', color: { rgb: 'BBBBBB' } },
    left:   { style: 'thin', color: { rgb: 'BBBBBB' } },
    right:  { style: 'thin', color: { rgb: 'BBBBBB' } },
  },
}

const CELL_STYLE = {
  alignment: { vertical: 'center', wrapText: true },
  border: {
    top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
    right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
  },
}

function makeSheet(headers: string[], rows: (string | number)[][], colWidths: number[]) {
  const data = [headers, ...rows]
  const ws = XLSXStyle.utils.aoa_to_sheet(data)

  const range = XLSXStyle.utils.decode_range(ws['!ref'] ?? 'A1')

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSXStyle.utils.encode_cell({ r: R, c: C })
      if (!ws[addr]) ws[addr] = { v: '', t: 's' }
      ws[addr].s = R === 0 ? HEADER_STYLE : CELL_STYLE
    }
  }

  ws['!cols'] = colWidths.map(wch => ({ wch }))
  ws['!rows'] = [{ hpt: 32 }]  // 헤더 행 높이

  return ws
}

export function exportToExcel(records: ConsultationRecord[], filename?: string): void {
  const wb = XLSXStyle.utils.book_new()

  // ── 시트 1: 원본 데이터 ──────────────────────────────────
  const headers = [
    'No', '방문일자', '작성자_부서명', '작성자_성명', '방문컨텐츠',
    '방문자_회사명', '방문자_부서명', '방문자_성명', '이메일', '전화번호',
    '상담내용',
    'Q1_인터엑스인지도', 'Q2_실무담당자여부', 'Q3_AI도입경험',
    'Q4_정부지원사업인지', 'Q5_후속미팅희망', 'Q6_해결문제있음',
    'Q7_해결하고싶은문제', '등록일시',
  ]

  const rows = records.map((r, i) => {
    const s = r.survey
    return [
      i + 1,
      r.visit_day ?? '',
      r.staff_dept, r.staff_name, r.visit_content,
      r.visitor_company, r.visitor_dept, r.visitor_name,
      r.visitor_email, r.visitor_phone,
      r.consultation_content,
      s.q1_brand_awareness ? `${s.q1_brand_awareness} (${SCORE_LABEL[s.q1_brand_awareness]})` : '',
      s.q2_decision_maker  ? `${s.q2_decision_maker}  (${SCORE_LABEL[s.q2_decision_maker]})` : '',
      s.q3_ai_experience   ? `${s.q3_ai_experience}   (${SCORE_LABEL[s.q3_ai_experience]})` : '',
      s.q4_gov_support_aware ? `${s.q4_gov_support_aware} (${SCORE_LABEL[s.q4_gov_support_aware]})` : '',
      s.q5_followup_meeting  ? `${s.q5_followup_meeting}  (${SCORE_LABEL[s.q5_followup_meeting]})` : '',
      s.q6_has_problem       ? `${s.q6_has_problem}       (${SCORE_LABEL[s.q6_has_problem]})` : '',
      s.q7_problem_desc,
      new Date(r.created_at).toLocaleString('ko-KR'),
    ]
  })

  const ws1 = makeSheet(headers, rows, [
    4, 16, 12, 10, 16,
    18, 12, 10, 24, 14,
    40, 16, 16, 14,
    16, 16, 16,
    30, 18,
  ])
  XLSXStyle.utils.book_append_sheet(wb, ws1, '방문자 상담일지')

  // ── 시트 2: 설문 분석 (숫자만) ──────────────────────────
  const analysisHeaders = ['방문자_회사명', '방문자_성명', ...SURVEY_QUESTIONS.map(q => q.key)]
  const analysisRows = records.map(r => [
    r.visitor_company, r.visitor_name,
    r.survey.q1_brand_awareness ?? '',
    r.survey.q2_decision_maker  ?? '',
    r.survey.q3_ai_experience   ?? '',
    r.survey.q4_gov_support_aware ?? '',
    r.survey.q5_followup_meeting  ?? '',
    r.survey.q6_has_problem       ?? '',
  ])

  const ws2 = makeSheet(analysisHeaders, analysisRows, [
    18, 10, 18, 18, 16, 18, 16, 16,
  ])
  XLSXStyle.utils.book_append_sheet(wb, ws2, '설문 분석')

  const fname = filename ?? `SIMTOS2026_상담일지_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.xlsx`
  XLSXStyle.writeFile(wb, fname)
}