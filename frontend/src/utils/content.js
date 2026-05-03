const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

function trimUrlCandidate(value) {
  return String(value || '').trim().replace(/[.,!?;:]+$/g, '');
}

export function toSafeHttpUrl(value) {
  try {
    const url = new URL(trimUrlCandidate(value));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url;
  } catch (_) {
    return null;
  }
}

function isHost(url, hosts) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return hosts.some(item => host === item || host.endsWith(`.${item}`));
}

function getYouTubeId(url) {
  if (!isHost(url, ['youtube.com', 'youtu.be', 'youtube-nocookie.com'])) return null;

  if (url.hostname.toLowerCase().includes('youtu.be')) {
    return sanitizeVideoId(url.pathname.slice(1).split('/')[0]);
  }

  const fromQuery = url.searchParams.get('v');
  if (fromQuery) return sanitizeVideoId(fromQuery);

  const match = url.pathname.match(/\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]+)/);
  return match ? sanitizeVideoId(match[1]) : null;
}

function sanitizeVideoId(value) {
  const id = String(value || '').match(/^[a-zA-Z0-9_-]{6,}$/);
  return id ? id[0] : null;
}

function getInstagramEmbed(url) {
  if (!isHost(url, ['instagram.com'])) return null;
  const match = url.pathname.match(/^\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
}

function getFacebookEmbed(url) {
  if (!isHost(url, ['facebook.com', 'fb.watch'])) return null;

  const href = encodeURIComponent(url.href);
  const isVideo =
    url.hostname.toLowerCase().includes('fb.watch') ||
    /\/(watch|videos|reel)\b/i.test(url.pathname);

  const endpoint = isVideo ? 'video.php' : 'post.php';
  const extra = isVideo ? '&show_text=true' : '&show_text=true';
  return `https://www.facebook.com/plugins/${endpoint}?href=${href}${extra}&width=680`;
}

export function detectEmbed(value) {
  const url = toSafeHttpUrl(value);
  if (!url) return null;

  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      platform: 'youtube',
      label: PLATFORM_LABELS.youtube,
      sourceUrl: url.href,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      aspect: '16 / 9',
    };
  }

  const instagramEmbed = getInstagramEmbed(url);
  if (instagramEmbed) {
    return {
      platform: 'instagram',
      label: PLATFORM_LABELS.instagram,
      sourceUrl: url.href,
      embedUrl: instagramEmbed,
      aspect: '4 / 5',
    };
  }

  const facebookEmbed = getFacebookEmbed(url);
  if (facebookEmbed) {
    return {
      platform: 'facebook',
      label: PLATFORM_LABELS.facebook,
      sourceUrl: url.href,
      embedUrl: facebookEmbed,
      aspect: '16 / 10',
    };
  }

  return null;
}

export function extractEmbedsFromText(text, max = 3) {
  const seen = new Set();
  const embeds = [];
  const matches = String(text || '').match(URL_PATTERN) || [];

  for (const match of matches) {
    const embed = detectEmbed(match);
    if (!embed || seen.has(embed.embedUrl)) continue;
    seen.add(embed.embedUrl);
    embeds.push(embed);
    if (embeds.length >= max) break;
  }

  return embeds;
}

export function getStandaloneEmbed(line) {
  const trimmed = trimUrlCandidate(line);
  if (!trimmed || /\s/.test(trimmed.replace(/^https?:\/\//i, ''))) return null;
  return detectEmbed(trimmed);
}

export function stripMarkdownForExcerpt(content, maxLength = 220) {
  const plain = String(content || '')
    .replace(/```[\s\S]*?```/g, ' kod blogu ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' matematik ifadesi ')
    .replace(URL_PATTERN, match => detectEmbed(match)?.label || match)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trim()}...`;
}

