import React, { useLayoutEffect } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * What a registration form tells a crawler once the page has loaded.
 *
 * The server already answers /form/{slug} with these tags for the scrapers
 * that never run JavaScript — WhatsApp, Facebook, LinkedIn, Slack. This is the
 * other half: it keeps the head correct for anyone who arrives by navigating
 * inside the app rather than by loading the URL cold, and it is what Google
 * reads after it renders the page.
 *
 * Both halves come from the same resolved block on the API, so the two can say
 * different things only if the form changed between the two requests.
 */
const FormHead = ({ seo }) => {
    /*
     * The server writes this page's tags into the HTML it serves, for the
     * scrapers that never run JavaScript. React then hoists the tags below into
     * the same head without merging them, so both sets would sit there together
     * — two descriptions, two og:titles, two blocks of structured data.
     *
     * So the server marks its own, and they are cleared here the moment there
     * is something to replace them with. Before paint, so nothing reads the
     * document mid-swap; and only when `seo` has arrived, so a slow API never
     * leaves the page with no tags at all.
     */
    useLayoutEffect(() => {
        if (!seo) return;

        document.head.querySelectorAll('[data-seo="server"]').forEach((node) => node.remove());
    }, [seo]);

    if (!seo) return null;

    const { title, description, image, canonical, url, keywords, robots, siteName, jsonLd } = seo;

    return (
        <Helmet prioritizeSeoTags>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={robots || 'index, follow'} />
            {canonical && <link rel="canonical" href={canonical} />}
            {keywords?.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}

            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={siteName || 'RegX'} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            {url && <meta property="og:url" content={url} />}
            {image && <meta property="og:image" content={image} />}

            <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {image && <meta name="twitter:image" content={image} />}

            {/*
              * schema.org/Event — the date, venue and entry fee, in the shape
              * that earns a search result with those facts on it rather than a
              * plain blue link.
              */}
            {jsonLd && Object.keys(jsonLd).length > 0 && (
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            )}
        </Helmet>
    );
};

export default FormHead;
