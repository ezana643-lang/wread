import { useMemo } from 'react';
import { detectEmbed, getStandaloneEmbed, toSafeHttpUrl } from '../../utils/content';

const INLINE_PATTERN = /(`[^`\n]+`|\[[^\]\n]+\]\([^)]+\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\$[^$\n]+\$)/g;

export function RichContent({ content, compact = false, className = '' }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);
  const rootClass = ['rich-content', compact ? 'rich-content--compact' : '', className].filter(Boolean).join(' ');

  if (!String(content || '').trim()) {
    return null;
  }

  return (
    <div className={rootClass}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

export function EmbedPreview({ embed }) {
  if (!embed) return null;

  return (
    <figure className={`embed-card embed-card--${embed.platform}`}>
      <div className="embed-card__chrome">
        <span className="embed-card__platform">{embed.label}</span>
        <a className="embed-card__source" href={embed.sourceUrl} target="_blank" rel="noreferrer">
          Kaynagi ac
        </a>
      </div>
      <div className="embed-card__frame" style={{ aspectRatio: embed.aspect }}>
        <iframe
          src={embed.embedUrl}
          title={`${embed.label} embed`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
        />
      </div>
    </figure>
  );
}

function parseBlocks(value) {
  const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', language, code: code.join('\n') });
      continue;
    }

    if (trimmed === '$$') {
      const formula = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== '$$') {
        formula.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'math', formula: formula.join('\n').trim() });
      continue;
    }

    const standaloneEmbed = getStandaloneEmbed(trimmed);
    if (standaloneEmbed) {
      blocks.push({ type: 'embed', embed: standaloneEmbed });
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', depth: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', text: quote.join('\n') });
      continue;
    }

    if (/^([-*+]\s+|\d+\.\s+)/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items = [];
      while (i < lines.length && /^([-*+]\s+|\d+\.\s+)/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^([-*+]\s+|\d+\.\s+)/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim()) {
      const next = lines[i].trim();
      if (
        next.startsWith('```') ||
        next === '$$' ||
        getStandaloneEmbed(next) ||
        /^(#{1,3})\s+/.test(next) ||
        next.startsWith('>') ||
        /^([-*+]\s+|\d+\.\s+)/.test(next)
      ) {
        break;
      }
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
  }

  return blocks;
}

function renderBlock(block, index) {
  const key = `${block.type}-${index}`;

  switch (block.type) {
    case 'heading': {
      const Heading = `h${Math.min(block.depth + 2, 5)}`;
      return <Heading key={key}>{renderInline(block.text, key)}</Heading>;
    }
    case 'quote':
      return <blockquote key={key}>{renderInlineMultiline(block.text, key)}</blockquote>;
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List key={key}>
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
          ))}
        </List>
      );
    }
    case 'code':
      return (
        <pre key={key} className="rich-content__code">
          {block.language && <span className="rich-content__code-lang">{block.language}</span>}
          <code>{block.code}</code>
        </pre>
      );
    case 'math':
      return (
        <div key={key} className="math-block" aria-label="LaTeX formulu">
          {block.formula}
        </div>
      );
    case 'embed':
      return <EmbedPreview key={key} embed={block.embed} />;
    default:
      return <p key={key}>{renderInlineMultiline(block.text, key)}</p>;
  }
}

function renderInlineMultiline(text, keyPrefix) {
  const lines = String(text || '').split('\n');
  return lines.flatMap((line, index) => {
    const rendered = renderInline(line, `${keyPrefix}-${index}`);
    if (index === lines.length - 1) return rendered;
    return [...rendered, <br key={`${keyPrefix}-br-${index}`} />];
  });
}

function renderInline(text, keyPrefix) {
  const value = String(text || '');
  const nodes = [];
  let lastIndex = 0;

  value.replace(INLINE_PATTERN, (match, _capture, offset) => {
    if (offset > lastIndex) nodes.push(value.slice(lastIndex, offset));
    nodes.push(renderInlineToken(match, `${keyPrefix}-${nodes.length}`));
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < value.length) nodes.push(value.slice(lastIndex));
  return nodes;
}

function renderInlineToken(token, key) {
  if (token.startsWith('`')) {
    return <code key={key}>{token.slice(1, -1)}</code>;
  }

  if (token.startsWith('[')) {
    const link = token.match(/^\[([^\]\n]+)\]\(([^)]+)\)$/);
    if (!link) return token;

    const safeUrl = toSafeHttpUrl(link[2]);
    if (!safeUrl) return link[1];

    const embed = detectEmbed(safeUrl.href);
    return (
      <a
        key={key}
        href={safeUrl.href}
        className={embed ? 'rich-content__platform-link' : undefined}
        target="_blank"
        rel="noreferrer"
      >
        {link[1]}
      </a>
    );
  }

  if (token.startsWith('**')) {
    return <strong key={key}>{token.slice(2, -2)}</strong>;
  }

  if (token.startsWith('*')) {
    return <em key={key}>{token.slice(1, -1)}</em>;
  }

  if (token.startsWith('$')) {
    return (
      <span key={key} className="math-inline" aria-label="LaTeX formulu">
        {token.slice(1, -1)}
      </span>
    );
  }

  return token;
}

