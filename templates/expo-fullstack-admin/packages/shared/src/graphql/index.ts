/**
 * GraphQL関連の共通定義
 * スキーマ、クエリ、ミューテーションの定義を共有する
 */

import { gql } from "@apollo/client";

// GraphQLスキーマ定義
export const typeDefs = gql`
  scalar DateTime

  enum Role {
    ADMIN
    ORG_ADMIN
    USER
  }

  type User {
    id: ID!
    email: String!
    name: String
    role: Role!
    posts: [Post!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Post {
    id: ID!
    title: String!
    content: String
    published: Boolean!
    author: User!
    authorId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Organization {
    id: ID!
    name: String!
    description: String
    members: [User!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    # ユーザー関連
    me: User
    users(limit: Int, offset: Int): [User!]!
    user(id: ID!): User

    # 投稿関連
    posts(published: Boolean, limit: Int, offset: Int): [Post!]!
    post(id: ID!): Post
    myPosts(limit: Int, offset: Int): [Post!]!

    # 組織関連
    organizations(limit: Int, offset: Int): [Organization!]!
    organization(id: ID!): Organization
  }

  type Mutation {
    # 認証関連
    login(email: String!, password: String!): AuthPayload!
    register(email: String!, password: String!, name: String): AuthPayload!
    logout: Boolean!

    # ユーザー関連
    updateProfile(name: String): User!
    deleteAccount: Boolean!

    # 投稿関連
    createPost(title: String!, content: String, published: Boolean): Post!
    updatePost(id: ID!, title: String, content: String, published: Boolean): Post!
    deletePost(id: ID!): Boolean!
    publishPost(id: ID!): Post!
    unpublishPost(id: ID!): Post!

    # 管理者機能
    createUser(email: String!, password: String!, name: String, role: Role): User!
    updateUser(id: ID!, email: String, name: String, role: Role): User!
    deleteUser(id: ID!): Boolean!

    # 組織関連
    createOrganization(name: String!, description: String): Organization!
    updateOrganization(id: ID!, name: String, description: String): Organization!
    deleteOrganization(id: ID!): Boolean!
  }

  type Subscription {
    # リアルタイム更新
    postAdded: Post!
    postUpdated: Post!
    postDeleted: ID!
    userUpdated: User!
  }
`;

// よく使用されるクエリフラグメント
export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    email
    name
    role
    createdAt
    updatedAt
  }
`;

export const POST_FRAGMENT = gql`
  fragment PostFields on Post {
    id
    title
    content
    published
    authorId
    createdAt
    updatedAt
  }
`;

export const ORGANIZATION_FRAGMENT = gql`
  fragment OrganizationFields on Organization {
    id
    name
    description
    createdAt
    updatedAt
  }
`;

// クエリ定義
export const GET_ME = gql`
  ${USER_FRAGMENT}
  query GetMe {
    me {
      ...UserFields
    }
  }
`;

export const GET_USERS = gql`
  ${USER_FRAGMENT}
  query GetUsers($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      ...UserFields
    }
  }
`;

export const GET_POSTS = gql`
  ${POST_FRAGMENT}
  ${USER_FRAGMENT}
  query GetPosts($published: Boolean, $limit: Int, $offset: Int) {
    posts(published: $published, limit: $limit, offset: $offset) {
      ...PostFields
      author {
        ...UserFields
      }
    }
  }
`;

export const GET_POST = gql`
  ${POST_FRAGMENT}
  ${USER_FRAGMENT}
  query GetPost($id: ID!) {
    post(id: $id) {
      ...PostFields
      author {
        ...UserFields
      }
    }
  }
`;

export const GET_MY_POSTS = gql`
  ${POST_FRAGMENT}
  query GetMyPosts($limit: Int, $offset: Int) {
    myPosts(limit: $limit, offset: $offset) {
      ...PostFields
    }
  }
`;

// ミューテーション定義
export const LOGIN = gql`
  ${USER_FRAGMENT}
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        ...UserFields
      }
    }
  }
`;

export const REGISTER = gql`
  ${USER_FRAGMENT}
  mutation Register($email: String!, $password: String!, $name: String) {
    register(email: $email, password: $password, name: $name) {
      token
      user {
        ...UserFields
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

export const CREATE_POST = gql`
  ${POST_FRAGMENT}
  mutation CreatePost($title: String!, $content: String, $published: Boolean) {
    createPost(title: $title, content: $content, published: $published) {
      ...PostFields
    }
  }
`;

export const UPDATE_POST = gql`
  ${POST_FRAGMENT}
  mutation UpdatePost($id: ID!, $title: String, $content: String, $published: Boolean) {
    updatePost(id: $id, title: $title, content: $content, published: $published) {
      ...PostFields
    }
  }
`;

export const DELETE_POST = gql`
  mutation DeletePost($id: ID!) {
    deletePost(id: $id)
  }
`;

export const UPDATE_PROFILE = gql`
  ${USER_FRAGMENT}
  mutation UpdateProfile($name: String) {
    updateProfile(name: $name) {
      ...UserFields
    }
  }
`;

// サブスクリプション定義
export const POST_ADDED = gql`
  ${POST_FRAGMENT}
  ${USER_FRAGMENT}
  subscription PostAdded {
    postAdded {
      ...PostFields
      author {
        ...UserFields
      }
    }
  }
`;

export const POST_UPDATED = gql`
  ${POST_FRAGMENT}
  ${USER_FRAGMENT}
  subscription PostUpdated {
    postUpdated {
      ...PostFields
      author {
        ...UserFields
      }
    }
  }
`;

export const POST_DELETED = gql`
  subscription PostDeleted {
    postDeleted
  }
`;

// EOF