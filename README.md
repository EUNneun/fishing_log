# Fishing Log 🐙

모바일에서 낚시 출조 기록을 간편하게 남기는 개인 낚시 일지입니다.

## 주요 기능

- 출조 날짜, 장소, 배 이름(선사), 선비 기록
- 어종, 채비, 날씨, 조과 및 최대 크기 기록
- 자유 메모 작성
- ChatGPT 계정별 기록 분리
- 모바일 중심 반응형 UI
- Cloudflare D1 데이터베이스 저장

같은 사이트를 친구와 함께 사용해도 각 사용자는 자신의 기록만 조회하고 작성할 수 있습니다.

## 기술 구성

- React + TypeScript
- Vinext / Vite
- Tailwind CSS
- Drizzle ORM
- Cloudflare Workers + D1
- OpenAI Sites 인증 및 배포

## 로컬 실행

Node.js 22.13 이상과 Linux 환경이 필요합니다.

```bash
npm ci
npm run dev
```

프로덕션 빌드:

```bash
npm run build
```

데이터베이스 스키마를 변경한 뒤 마이그레이션 생성:

```bash
npm run db:generate
```

## 배포 참고

이 프로젝트는 서버 인증과 D1 데이터베이스를 사용하므로 정적 GitHub Pages만으로는 전체 기능이 동작하지 않습니다. OpenAI Sites 또는 Cloudflare Workers처럼 서버 런타임과 D1 바인딩을 제공하는 환경에 배포해야 합니다.

`.openai/hosting.json`에는 공개 가능한 기능 선언만 포함되어 있습니다. OpenAI Sites에서 새 프로젝트로 등록하면 배포 프로젝트 ID가 자동으로 추가됩니다.

기존 데이터 중 `owner_email`이 비어 있는 레코드를 원래 사용자에게 연결하려면 배포 환경에 `ORIGINAL_OWNER_EMAIL`을 설정하세요. 새 설치에서는 설정하지 않아도 됩니다.

## 데이터 보호

낚시 기록은 로그인한 사용자의 이메일을 소유자 식별자로 사용해 분리합니다. 운영 환경에서는 반드시 인증 헤더를 신뢰할 수 있는 배포 플랫폼을 사용하세요.
