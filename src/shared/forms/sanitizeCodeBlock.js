const HTML_LIMIT = 12000;
const ALLOWED_TAGS = new Set([
    'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h1', 'h2',
    'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'li', 'ol', 'p', 'pre', 's', 'small',
    'span', 'strong', 'sub', 'sup', 'u', 'ul',
]);
const DROP_CONTENT_TAGS = new Set([
    'base', 'button', 'embed', 'form', 'iframe', 'input', 'link', 'math', 'meta',
    'noscript', 'object', 'option', 'script', 'select', 'style', 'svg', 'template',
    'textarea',
]);
const VOID_TAGS = new Set(['br', 'hr']);
const CSS_ELEMENTS = new Set([
    'a', 'abbr', 'b', 'blockquote', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4',
    'h5', 'h6', 'hr', 'i', 'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong',
    'sub', 'sup', 'u', 'ul',
]);

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const validColor = (value) =>
    /^(#[\da-f]{3,8}|[a-z]{1,24}|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+-]+\))$/i.test(value);

const validLength = (value, { signed = false, auto = false, percent = true } = {}) => {
    if (auto && /^(auto|none|normal|fit-content)$/i.test(value)) return true;
    const sign = signed ? '-?' : '';
    const units = percent ? 'px|rem|em|%|vh|vw' : 'px|rem|em';
    return new RegExp(`^${sign}(?:0|(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:${units}))$`, 'i').test(value);
};

const CSS_VALUE_RULES = {
    color: validColor,
    'background-color': validColor,
    'border-color': validColor,
    'font-size': (value) => validLength(value, { auto: true }),
    'font-weight': (value) => /^(normal|bold|bolder|lighter|[1-9]00)$/i.test(value),
    'font-style': (value) => /^(normal|italic|oblique)$/i.test(value),
    'font-family': (value) => /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(value),
    'text-align': (value) => /^(left|right|center|justify|start|end)$/i.test(value),
    'text-decoration': (value) => /^(none|underline|overline|line-through)$/i.test(value),
    display: (value) => /^(block|inline|inline-block|flex|grid|list-item|none)$/i.test(value),
    'list-style-type': (value) => /^(disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman|none)$/i.test(value),
    'align-items': (value) => /^(start|end|center|stretch|baseline)$/i.test(value),
    'justify-content': (value) => /^(start|end|center|space-between|space-around|space-evenly)$/i.test(value),
    'white-space': (value) => /^(normal|pre|pre-wrap|pre-line|nowrap)$/i.test(value),
    'overflow-wrap': (value) => /^(normal|anywhere|break-word)$/i.test(value),
    'word-break': (value) => /^(normal|break-all|keep-all|break-word)$/i.test(value),
    'line-height': (value) => validLength(value, { auto: true, percent: false }) || /^\d+(?:\.\d+)?$/.test(value),
    width: (value) => validLength(value, { auto: true }),
    'max-width': (value) => validLength(value, { auto: true }),
    height: (value) => validLength(value, { auto: true }),
    'max-height': (value) => validLength(value, { auto: true }),
    margin: (value) => value.split(/\s+/).length <= 4 && value.split(/\s+/).every((part) => validLength(part, { signed: true, auto: true })),
    padding: (value) => value.split(/\s+/).length <= 4 && value.split(/\s+/).every((part) => validLength(part)),
    gap: (value) => value.split(/\s+/).length <= 2 && value.split(/\s+/).every((part) => validLength(part)),
    'border-radius': (value) => value.split(/\s+/).length <= 4 && value.split(/\s+/).every((part) => validLength(part)),
    border: (value) => /^(?:0|\d+(?:\.\d+)?px)\s+(?:solid|dashed|dotted|double)\s+(?:#[\da-f]{3,8}|[a-z]{1,24})$/i.test(value),
};

const sanitizeDeclarations = (input) => {
    const declarations = [];

    for (const declaration of String(input).split(';')) {
        const separator = declaration.indexOf(':');
        if (separator < 1) continue;

        const property = declaration.slice(0, separator).trim().toLowerCase();
        const value = declaration.slice(separator + 1).trim();
        const validate = CSS_VALUE_RULES[property];

        if (!validate || value === '' || /url\s*\(|expression\s*\(|var\s*\(|javascript:|[{}<>\\@]/i.test(value)) {
            continue;
        }

        if (validate(value) && (!globalThis.CSS?.supports || CSS.supports(property, value))) {
            declarations.push(`${property}:${value}`);
        }
    }

    return declarations.join(';');
};

const safeUrl = (value) => {
    const raw = value.trim();
    if (!raw || raw.startsWith('//')) return null;

    try {
        const url = new URL(raw, window.location.origin);
        if (url.protocol === 'https:' || url.protocol === 'mailto:' || url.origin === window.location.origin) {
            return raw;
        }
    } catch {
        return null;
    }

    return null;
};

const serializeNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.nodeValue ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    if (DROP_CONTENT_TAGS.has(tag)) return '';

    const children = [...node.childNodes].map(serializeNode).join('');
    if (!ALLOWED_TAGS.has(tag)) return children;

    const attributes = [];
    for (const attribute of node.attributes) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();

        if (name === 'class') {
            const classes = value.split(/\s+/).filter((part) => /^[a-z\d_-]{1,48}$/i.test(part));
            if (classes.length) attributes.push(`class="${escapeHtml(classes.join(' '))}"`);
        } else if (name === 'title' || name === 'aria-label') {
            attributes.push(`${name}="${escapeHtml(value)}"`);
        } else if (name === 'style') {
            const style = sanitizeDeclarations(value);
            if (style) attributes.push(`style="${escapeHtml(style)}"`);
        } else if (tag === 'a' && name === 'href') {
            const href = safeUrl(value);
            if (href) attributes.push(`href="${escapeHtml(href)}"`);
        }
    }

    if (tag === 'a' && attributes.some((attribute) => attribute.startsWith('href='))) {
        attributes.push('target="_blank"', 'rel="noopener noreferrer"');
    }

    const opening = `<${tag}${attributes.length ? ` ${attributes.join(' ')}` : ''}>`;
    return VOID_TAGS.has(tag) ? opening : `${opening}${children}</${tag}>`;
};

export const sanitizeCodeBlockHtml = (input) => {
    const html = String(input ?? '').slice(0, HTML_LIMIT);
    const document = new DOMParser().parseFromString(html, 'text/html');
    return [...document.body.childNodes].map(serializeNode).join('');
};

const validSelector = (selector) => {
    const tokens = selector.trim().split(/\s+/);
    if (tokens.length === 0) return false;

    return tokens.every((token) => {
        if (token === '*') return true;
        if (token.startsWith('.')) return /^[a-z\d_-]{1,48}$/i.test(token.slice(1));
        return CSS_ELEMENTS.has(token.toLowerCase());
    });
};

export const sanitizeCodeBlockCss = (input) => {
    let css = String(input ?? '').slice(0, HTML_LIMIT);
    if (/\\|@|url\s*\(|expression\s*\(|var\s*\(|javascript:/i.test(css)) return '';

    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    if (css.includes('/*')) return '';

    const rules = [];
    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
    let lastIndex = 0;
    let match;

    while ((match = rulePattern.exec(css)) !== null) {
        if (css.slice(lastIndex, match.index).trim() !== '') return '';

        const selectors = match[1].split(',').map((selector) => selector.trim());
        if (selectors.some((selector) => !validSelector(selector))) {
            lastIndex = rulePattern.lastIndex;
            continue;
        }

        const declarations = sanitizeDeclarations(match[2]);
        if (declarations) {
            const scoped = selectors.map((selector) => `.regx-code-block-content ${selector}`).join(',');
            rules.push(`${scoped}{${declarations}}`);
        }

        lastIndex = rulePattern.lastIndex;
    }

    if (css.slice(lastIndex).trim() !== '') return '';
    return rules.join('\n');
};
