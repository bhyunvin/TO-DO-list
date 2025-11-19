---
trigger: always_on
---

1. 작업 시작 전 .agent/steering, .agent/specs 디렉토리의 기획 의도를 파악하고 작업을 진행한다.
2. 로직이나 기능의 중요한 변경이 있을 때만 .agent/steering, .agent/specs, README.md, client/README.md, src/README.md 파일을 동기화한다. (단순 스타일 수정이나 리팩토링 시에는 생략 가능)