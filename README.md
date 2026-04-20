# 📄 OCR → Excel 변환 웹 서비스

이미지를 업로드하면 OCR을 통해 텍스트를 추출하고, 이를 Excel 파일로 변환하여 다운로드할 수 있는 웹 서비스입니다.

---

## 🚀 프로젝트 개요

본 프로젝트는 사용자가 업로드한 이미지에서 텍스트를 추출한 뒤,
구조화하여 Excel 파일로 변환해주는 간단한 자동화 웹 서비스입니다.

* 이미지 업로드
* OCR 처리 (AI 기반)
* 데이터 가공
* Excel 파일 다운로드

---

## 🧩 기술 스택

### 🔹 Frontend

* React (Vite)
* TypeScript
* CSS

### 🔹 Backend

* FastAPI
* Python

### 🔹 AI / OCR

* Google Gemini API (Gemini Flash 모델)

---

## 📁 프로젝트 구조

### Frontend

```
src/
 ┣ components/        # 공통 UI 컴포넌트
 ┣ pages/             # 페이지 단위 컴포넌트
 ┃ ┣ CapturePage.tsx
 ┃ ┣ ResultPage.tsx
 ┃ ┣ ListPage.tsx
 ┃ ┣ BatchCapturePage.tsx
 ┃ ┗ BatchResultPage.tsx
 ┣ services/          # API 및 로직 처리
 ┃ ┣ api.ts           # 서버 통신
 ┃ ┣ gemini.ts        # OCR 요청 처리
 ┃ ┣ excel.ts         # Excel 생성 로직
 ┃ ┗ storage.ts       # 로컬 저장 처리
 ┣ types/             # 타입 정의
 ┣ App.tsx
 ┗ main.tsx
```

### Backend (예시)

```
app/
 ┣ main.py            # FastAPI entrypoint
 ┣ routes/            # API 라우터
 ┣ services/          # OCR 및 Excel 처리 로직
 ┗ utils/             # 공통 유틸
```

---

## ⚙️ 동작 흐름

```
1. 사용자 이미지 업로드
2. 프론트엔드 → 백엔드 API 요청
3. 백엔드 → Gemini API로 OCR 요청
4. 텍스트 결과 반환
5. Excel 파일 생성
6. 사용자에게 다운로드 제공
```

---

## 💡 주요 특징

* 별도의 DB 없이 동작 (Stateless 구조)
* 외부 AI API를 활용한 경량 서버 구조
* 실시간 처리 후 즉시 다운로드 제공
* 단일 요청 기반 파이프라인

---

## 🌐 배포 구조

| 구성       | 배포               |
| -------- | ---------------- |
| Frontend | Vercel           |
| Backend  | Render / AWS EC2 |
| AI API   | Google Gemini    |

---

## 🔧 실행 방법

### 1. Frontend 실행

```bash
npm install
npm run dev
```

### 2. Backend 실행

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 🔑 환경 변수

```
GEMINI_API_KEY=your_api_key
```

---

## 📌 향후 개선 사항

* 사용자 로그인 및 이력 관리
* OCR 결과 저장 (DB 연동)
* 다양한 파일 형식 지원 (CSV, PDF)
* 대용량 파일 처리 최적화

---

## 👨‍💻 프로젝트 목적

* OCR 자동화 서비스 구현 경험
* AI API 연동 및 데이터 처리 파이프라인 구축
* 프론트-백엔드 분리 구조 이해 및 배포 경험

```
```
