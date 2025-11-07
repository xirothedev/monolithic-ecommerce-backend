export function getDiscordAvatarUrl(avatarHash: string, discordUserId: string) {
  const isAnimated = avatarHash.startsWith('a_');
  const format = isAnimated ? 'gif' : 'png';
  const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.${format}?size=512`;

  return avatarUrl;
}
