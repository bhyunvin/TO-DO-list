---
trigger: always_on
---

1. 프로젝트 핵심 스택: Frontend(React + Vite), Backend(NestJS) - 모노레포 구조를 준수한다.
2. 작업 시작 전 .agent/steering, .agent/specs 디렉토리의 기획 의도와 규칙을 파악하고 작업을 진행한다. (특히 spec-guidelines.md의 언어 규칙은 Global Rules보다 우선하여 적용한다.)
3. 로직이나 기능의 중요한 변경이 있을 때만 다음 문서들을 반드시 동기화한다. (단순 스타일 수정이나 리팩토링 시에는 생략 가능)
    - 기획 문서: .agent/steering 및 .agent/specs 내의 **'영문 원본'과 'ko/ 디렉토리 내 한글 번역본' 모두** 업데이트
    - 설명 문서: README.md, client/README.md, src/README.md