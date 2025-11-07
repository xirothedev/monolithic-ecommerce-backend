export interface Payload {
  sub: string;
  email: string;
  timestamp: string;
}

export const MfaStatus = {
  ENABLE: 'enable',
  DISABLE: 'disable',
} as const;

export type MfaStatus = (typeof MfaStatus)[keyof typeof MfaStatus];

export interface GoogleProfile {
  id: string;
  displayName: string;
  name: { familyName: string; givenName: string };
  emails: [{ value: string; verified: boolean }];
  photos: [{ value: string }];
  provider: 'google';
  _raw: string;
  _json: {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
  };
}

export interface GithubProfile {
  id: string;
  nodeId: string;
  displayName: string;
  username: string;
  profileUrl: string;
  photos: [{ value: string }];
  provider: 'github';
  emails: [{ value: string }];
  _raw: string;
  _json: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
    name: string;
    company: string | null;
    blog: string;
    location: string;
    email: string | null;
    hireable: boolean;
    bio: string;
    twitter_username: string | null;
    notification_email: string | null;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
  };
}

export interface DiscordProfile {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  public_flags: number;
  flags: number;
  banner: string | null;
  accent_color: number | null;
  global_name: string | null;
  avatar_decoration_data: {
    asset: string;
    sku_id: string;
    expires_at: string | null;
  } | null;
  collectibles: unknown;
  banner_color: string | null;
  clan: {
    identity_guild_id: string;
    identity_enabled: boolean;
    tag: string;
    badge: string;
  } | null;
  primary_guild: {
    identity_guild_id: string;
    identity_enabled: boolean;
    tag: string;
    badge: string;
  } | null;
  mfa_enabled: boolean;
  locale: string;
  premium_type: number;
  email: string;
  verified: boolean;
  provider: 'discord';
  accessToken: string;
  fetchedAt: string | Date;
}
