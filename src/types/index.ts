export type VisitDay = '1일차-4/13(월)' | '2일차-4/14(화)' | '3일차-4/15(수)' | '4일차-4/16(목)' | '5일차-4/17(금)'

export type SurveyScore = 1 | 2 | 3 | 4 | 5 | null

export interface SurveyAnswers {
  q1_brand_awareness: SurveyScore       // 인터엑스 기업 인지도
  q2_decision_maker: SurveyScore        // 실무진/의사결정 담당자
  q3_ai_experience: SurveyScore         // AI 도입 경험
  q4_gov_support_aware: SurveyScore     // 정부지원사업 인지
  q5_followup_meeting: SurveyScore      // 후속 미팅 희망
  q6_has_problem: SurveyScore           // 해결하고 싶은 문제 있음
  q7_problem_desc: string               // 문제 서술 (q6 >= 4일 때)
}

export interface ConsultationRecord {
  id: string
  created_at: string

  // 방문 기본
  visit_day: VisitDay | null

  // 작성자 (InterX 직원)
  staff_dept: string
  staff_name: string
  visit_content: string  // 방문 컨텐츠

  // 방문자
  visitor_company: string
  visitor_dept: string
  visitor_name: string
  visitor_email: string
  visitor_phone: string

  // 상담내용
  consultation_content: string

  // 설문
  survey: SurveyAnswers

  // 상담지 이미지
  form_image_b64?: string
}

export type ViewMode = 'list' | 'new' | 'detail'

export const VISIT_DAYS: VisitDay[] = [
  '1일차-4/13(월)',
  '2일차-4/14(화)',
  '3일차-4/15(수)',
  '4일차-4/16(목)',
  '5일차-4/17(금)',
]

export const SURVEY_QUESTIONS: { key: keyof SurveyAnswers; label: string }[] = [
  { key: 'q1_brand_awareness', label: '인터엑스라는 기업에 대해 잘 알고 있는 상태에서 방문하였다' },
  { key: 'q2_decision_maker', label: '소속된 기업의 제조 AI 관련 업무의 실무진 또는 의사결정 담당자이다' },
  { key: 'q3_ai_experience', label: '소속된 기업에서 AI 도입을 진행했던 경험이 있다' },
  { key: 'q4_gov_support_aware', label: '관련 정부지원사업에 대해 잘 알고 있다' },
  { key: 'q5_followup_meeting', label: '본 상담 이후 보다 자세한 상담을 위해 후속 미팅을 희망한다' },
  { key: 'q6_has_problem', label: '소속된 기업에서 제조 AX(AI전환)를 통해 가장 해결하고 싶은 문제가 있다' },
]

export const defaultSurvey = (): SurveyAnswers => ({
  q1_brand_awareness: null,
  q2_decision_maker: null,
  q3_ai_experience: null,
  q4_gov_support_aware: null,
  q5_followup_meeting: null,
  q6_has_problem: null,
  q7_problem_desc: '',
})

export const defaultRecord = (): Omit<ConsultationRecord, 'id' | 'created_at'> => ({
  visit_day: null,
  staff_dept: '',
  staff_name: '',
  visit_content: '',
  visitor_company: '',
  visitor_dept: '',
  visitor_name: '',
  visitor_email: '',
  visitor_phone: '',
  consultation_content: '',
  survey: defaultSurvey(),
})
