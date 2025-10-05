# API Documentation

{{PROJECT_NAME}} のAPI仕様書

## 🔑 認証

このAPIは NextAuth.js のセッションベース認証を使用しています。

### 認証ヘッダー

すべてのAPI呼び出しにはセッションCookieが必要です。

```http
Cookie: next-auth.session-token=your-session-token
```

## 🔒 権限

### ロール定義
- **ADMIN**: すべてのリソースにアクセス可能
- **MANAGER**: 所属組織のユーザー管理可能
- **USER**: 自分の情報のみアクセス可能

## 📚 エンドポイント

### 認証 API

#### POST /api/auth/signin
ユーザーログイン

**リクエスト:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス:**
```json
{
  "user": {
    "id": "clxxxxx",
    "name": "ユーザー名",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

#### POST /api/auth/signout
ユーザーログアウト

### ユーザー API

#### GET /api/users
ユーザー一覧取得

**クエリパラメータ:**
- `organizationId` (optional): 組織IDでフィルタ

**権限:** ADMIN, MANAGER

**レスポンス:**
```json
[
  {
    "id": "clxxxxx",
    "name": "ユーザー名",
    "email": "user@example.com",
    "role": "USER",
    "organizationId": "clyyyyy",
    "organization": {
      "id": "clyyyyy",
      "name": "組織名"
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### POST /api/users
ユーザー作成

**権限:** ADMIN, MANAGER

**リクエスト:**
```json
{
  "name": "新しいユーザー",
  "email": "newuser@example.com",
  "password": "securepassword",
  "role": "USER",
  "organizationId": "clyyyyy"
}
```

**レスポンス:**
```json
{
  "id": "clxxxxx",
  "name": "新しいユーザー",
  "email": "newuser@example.com",
  "role": "USER",
  "organizationId": "clyyyyy",
  "organization": {
    "id": "clyyyyy",
    "name": "組織名"
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### GET /api/users/[id]
ユーザー詳細取得

**権限:** ADMIN, MANAGER, または本人

**レスポンス:**
```json
{
  "id": "clxxxxx",
  "name": "ユーザー名",
  "email": "user@example.com",
  "role": "USER",
  "organizationId": "clyyyyy",
  "organization": {
    "id": "clyyyyy",
    "name": "組織名"
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### PUT /api/users/[id]
ユーザー更新

**権限:** ADMIN, MANAGER, または本人

**リクエスト:**
```json
{
  "name": "更新されたユーザー名",
  "email": "updated@example.com",
  "role": "MANAGER"
}
```

#### DELETE /api/users/[id]
ユーザー削除

**権限:** ADMIN のみ

### 組織 API

#### GET /api/organizations
組織一覧取得

**権限:** 認証済みユーザー

**レスポンス:**
```json
[
  {
    "id": "clyyyyy",
    "name": "組織名",
    "description": "組織の説明",
    "website": "https://example.com",
    "users": [
      {
        "id": "clxxxxx",
        "name": "ユーザー名",
        "email": "user@example.com",
        "role": "USER"
      }
    ],
    "_count": {
      "users": 5
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### POST /api/organizations
組織作成

**権限:** ADMIN のみ

**リクエスト:**
```json
{
  "name": "新しい組織",
  "description": "組織の説明",
  "website": "https://neworg.com"
}
```

#### GET /api/organizations/[id]
組織詳細取得

**権限:** 認証済みユーザー

#### PUT /api/organizations/[id]
組織更新

**権限:** ADMIN のみ

#### DELETE /api/organizations/[id]
組織削除

**権限:** ADMIN のみ

## 🚨 エラーハンドリング

### エラーレスポンス形式

```json
{
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "details": {
    "field": "エラーの詳細情報"
  }
}
```

### HTTPステータスコード

- `200`: 成功
- `201`: 作成成功
- `400`: リクエストエラー
- `401`: 認証が必要
- `403`: 権限不足
- `404`: リソースが見つからない
- `422`: バリデーションエラー
- `500`: サーバーエラー

### よくあるエラー

#### 認証エラー
```json
{
  "error": "認証が必要です",
  "code": "UNAUTHORIZED"
}
```

#### 権限エラー
```json
{
  "error": "管理者権限が必要です",
  "code": "FORBIDDEN"
}
```

#### バリデーションエラー
```json
{
  "error": "入力データが正しくありません",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "有効なメールアドレスを入力してください",
    "password": "パスワードは8文字以上で入力してください"
  }
}
```

## 🔄 ページネーション

大量のデータを返すエンドポイントではページネーションを使用します。

### リクエストパラメータ

- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20、最大: 100）

### レスポンス形式

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔍 フィルタリング

### ユーザー検索

`GET /api/users?search=keyword&role=USER&organizationId=clyyyyy`

### 組織検索

`GET /api/organizations?search=keyword`

## 📝 使用例

### JavaScript/TypeScript

```typescript
// ユーザー一覧取得
const response = await fetch('/api/users', {
  credentials: 'include'
});
const users = await response.json();

// ユーザー作成
const newUser = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    name: '新しいユーザー',
    email: 'newuser@example.com',
    password: 'securepassword',
    role: 'USER'
  })
});
```

### cURL

```bash
# ユーザー一覧取得
curl -X GET http://localhost:3000/api/users \
  -H "Cookie: next-auth.session-token=your-session-token"

# ユーザー作成
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-session-token" \
  -d '{
    "name": "新しいユーザー",
    "email": "newuser@example.com",
    "password": "securepassword",
    "role": "USER"
  }'
```

---

💫 Generated with [Fluorite Flake](https://github.com/kotsutsumi/fluorite-flake)
