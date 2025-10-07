export const typeDefs = `#graphql
  scalar DateTime

  type User {
    id: String!
    email: String!
    name: String
    image: String
    role: String!
    MemberId: String
    memberSince: DateTime
    metadata: String
    isActive: Boolean!
    memberships: [Membership!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type OrganizationSummary {
    id: String!
    name: String!
  }

  type Membership {
    id: String!
    role: String!
    organization: OrganizationSummary
  }

  type Session {
    id: String!
    token: String!
    expiresAt: DateTime!
    user: User!
  }

  type DeviceInfo {
    id: String!
    deviceId: String!
    platform: String!
    osVersion: String
    appVersion: String
    deviceModel: String
    deviceName: String
    pushToken: String
    timezone: String
    locale: String
    firstSeenAt: DateTime!
    lastSeenAt: DateTime!
    isActive: Boolean!
  }

  type AccessLog {
    id: String!
    userId: String
    sessionId: String
    deviceId: String
    ipAddress: String
    userAgent: String
    method: String!
    path: String!
    query: String
    statusCode: Int
    responseTime: Int
    referrer: String
    country: String
    city: String
    platform: String
    appVersion: String
    organizationId: String
    createdAt: DateTime!
    user: User
    device: DeviceInfo
  }

  type AccessLogConnection {
    logs: [AccessLog!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type AuthPayload {
    token: String!
    user: User!
    expiresAt: DateTime!
    refreshToken: String
  }

  input LoginInput {
    email: String!
    password: String!
    deviceId: String
    platform: String
    deviceInfo: DeviceInfoInput
  }

  input RegisterInput {
    email: String!
    password: String!
    name: String
    deviceId: String
    platform: String
    deviceInfo: DeviceInfoInput
  }

  input DeviceInfoInput {
    osVersion: String
    appVersion: String
    deviceModel: String
    deviceName: String
    pushToken: String
    timezone: String
    locale: String
    metadata: String
  }

  input AccessLogInput {
    method: String!
    path: String!
    query: String
    statusCode: Int
    responseTime: Int
    referrer: String
    platform: String
    appVersion: String
    deviceId: String
  }

  type Query {
    me: User
    myDevices: [DeviceInfo!]!
    accessLogs(
      limit: Int = 50
      offset: Int = 0
      platform: String
      userId: String
      startDate: DateTime
      endDate: DateTime
    ): AccessLogConnection!
    accessStats: AccessStats!
  }

  type Mutation {
    # Authentication
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!

    # Device Management
    registerDevice(deviceInfo: DeviceInfoInput!, deviceId: String!, platform: String!): DeviceInfo!
    updateDevice(deviceId: String!, deviceInfo: DeviceInfoInput!): DeviceInfo!
    updatePushToken(deviceId: String!, pushToken: String!): DeviceInfo!

    # Access Logging
    logAccess(input: AccessLogInput!): Boolean!
  }

  type AccessStats {
    totalAccesses: Int!
    uniqueUsers: Int!
    uniqueDevices: Int!
    topPlatforms: [PlatformStats!]!
    recentActivity: [AccessLog!]!
    hourlyStats: [HourlyStats!]!
  }

  type PlatformStats {
    platform: String!
    count: Int!
    percentage: Float!
  }

  type HourlyStats {
    hour: Int!
    count: Int!
  }

  #  Member Management Types
  input MemberInput {
    userId: String!
    MemberId: String!
    memberSince: DateTime
  }

  input UpdateUserRoleInput {
    userId: String!
    role: String!
    MemberId: String
  }

  # Extended Query and Mutation types
  extend type Query {
    #  Member Management (Admin only)
    Members(limit: Int = 50, offset: Int = 0): [User!]!
  }

  extend type Mutation {
    #  Member Management (Admin only)
    assignMember(input: MemberInput!): User!
    updateUserRole(input: UpdateUserRoleInput!): User!
    deactivateUser(userId: String!): User!
    reactivateUser(userId: String!): User!
  }
`;

// EOF
