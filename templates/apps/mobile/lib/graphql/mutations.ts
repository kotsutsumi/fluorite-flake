/**
 * モバイルアプリが利用する認証系 GraphQL Mutation を定義する。
 * - LOGIN_MUTATION: メール + パスワードでセッションを確立し、トークンとユーザー情報を取得
 * - LOGOUT_MUTATION: サーバー側のセッションを破棄
 * - REGISTER_MUTATION: 新規ユーザーを作成し、必要に応じてトークンを受け取る
 */
import { gql } from "@apollo/client";

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      expiresAt
      user {
        id
        email
        name
        role
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      expiresAt
      user {
        id
        email
        name
        role
      }
    }
  }
`;

// EOF
