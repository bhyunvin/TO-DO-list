#!/bin/bash

# E2E 테스트를 위한 자격 증명 가져오기 스크립트
# 이 스크립트는 macOS 키체인에서 비밀번호를 가져와 .env.test 파일을 업데이트합니다

echo "🔐 Fetching credentials from macOS Keychain..."

# 데이터베이스 비밀번호 가져오기
DB_PASSWORD=$(security find-generic-password -s "todo-list" -a "encrypt-db-password" -w 2>/dev/null)

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Database password not found in keychain"
    echo "   Please ensure 'encrypt-db-password' is stored in keychain service 'todo-list'"
    exit 1
fi

# 세션 키 가져오기
SESSION_SECRET=$(security find-generic-password -s "todo-list" -a "encrypt-session-key" -w 2>/dev/null)

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ Error: Session secret not found in keychain"
    echo "   Please ensure 'encrypt-session-key' is stored in keychain service 'todo-list'"
    exit 1
fi

# .env.test 파일 업데이트
ENV_TEST_FILE="$(dirname "$0")/../.env.test"

# TEST_DB_PASSWORD 업데이트
if grep -q "^TEST_DB_PASSWORD=" "$ENV_TEST_FILE"; then
    # macOS sed 문법 사용
    sed -i '' "s|^TEST_DB_PASSWORD=.*|TEST_DB_PASSWORD=$DB_PASSWORD|" "$ENV_TEST_FILE"
else
    echo "TEST_DB_PASSWORD=$DB_PASSWORD" >> "$ENV_TEST_FILE"
fi

# TEST_SESSION_SECRET 업데이트
if grep -q "^TEST_SESSION_SECRET=" "$ENV_TEST_FILE"; then
    sed -i '' "s|^TEST_SESSION_SECRET=.*|TEST_SESSION_SECRET=$SESSION_SECRET|" "$ENV_TEST_FILE"
else
    echo "TEST_SESSION_SECRET=$SESSION_SECRET" >> "$ENV_TEST_FILE"
fi

echo "✅ Credentials successfully updated in .env.test"
echo ""
echo "⚠️  SECURITY WARNING:"
echo "   .env.test now contains sensitive credentials"
echo "   Make sure it's listed in .gitignore"
echo ""
echo "You can now run E2E tests with:"
echo "   npm test -- --config=test/jest-e2e.json"
