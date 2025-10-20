/**
 * モバイルアプリが Better Auth / API の状態を取得するための GraphQL Query 群。
 * - ME_QUERY: ログイン済みユーザーのプロファイルとアクティブ状態を取得
 * - MY_DEVICES_QUERY: デバイス登録状況を取得してセキュリティ可視化に活用
 */
import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      role
      isActive
    }
  }
`;

export const MY_DEVICES_QUERY = gql`
  query MyDevices {
    myDevices {
      id
      deviceId
      platform
      osVersion
      appVersion
      deviceModel
      deviceName
      lastSeenAt
      isActive
    }
  }
`;

// EOF
