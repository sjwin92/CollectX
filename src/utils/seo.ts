import React from 'react';
import { APP_CONFIG } from '@/config/app';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export const updateSEO = ({
  title = APP_CONFIG.name,
  description = APP_CONFIG.seo.siteDescription,
  keywords = [...APP_CONFIG.seo.keywords],
  image = APP_CONFIG.seo.ogImage,
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website',
  author = APP_CONFIG.seo.author,
  publishedTime,
  modifiedTime
}: SEOProps = {}) => {
  // Update document title
  document.title = title.includes(APP_CONFIG.name) ? title : `${title} | ${APP_CONFIG.name}`;

  // Helper function to update or create meta tags
  const updateMetaTag = (property: string, content: string, isName = false) => {
    const selector = isName ? `meta[name="${property}"]` : `meta[property="${property}"]`;
    let element = document.querySelector(selector);
    
    if (!element) {
      element = document.createElement('meta');
      if (isName) {
        element.setAttribute('name', property);
      } else {
        element.setAttribute('property', property);
      }
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  };

  // Basic meta tags
  updateMetaTag('description', description, true);
  updateMetaTag('keywords', keywords.join(', '), true);
  updateMetaTag('author', author, true);

  // Open Graph tags
  updateMetaTag('og:title', title);
  updateMetaTag('og:description', description);
  updateMetaTag('og:image', `${APP_CONFIG.baseUrl}${image}`);
  updateMetaTag('og:url', url);
  updateMetaTag('og:type', type);
  updateMetaTag('og:site_name', APP_CONFIG.seo.siteName);

  // Twitter Card tags
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:site', APP_CONFIG.seo.twitterSite);
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
  updateMetaTag('twitter:image', `${APP_CONFIG.baseUrl}${image}`);

  // Article-specific tags
  if (type === 'article') {
    if (author) updateMetaTag('article:author', author);
    if (publishedTime) updateMetaTag('article:published_time', publishedTime);
    if (modifiedTime) updateMetaTag('article:modified_time', modifiedTime);
  }

  // Canonical URL
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
};

// React hook for SEO
export const useSEO = (seoProps: SEOProps) => {
  React.useEffect(() => {
    updateSEO(seoProps);
  }, [seoProps]);
};

// Page-specific SEO configurations
export const SEO_CONFIGS = {
  home: {
    title: 'PokéTrade Hub - Trade Pokemon Cards & Manage Collections',
    description: 'The ultimate platform for Pokemon card trading. Build your collection, trade with other collectors, and discover rare cards.',
    keywords: ['pokemon cards', 'trading', 'collection', 'TCG', 'marketplace']
  },
  
  marketplace: {
    title: 'Marketplace - Buy & Trade Pokemon Cards',
    description: 'Browse and trade Pokemon cards with collectors worldwide. Find rare cards, make offers, and expand your collection.',
    keywords: ['pokemon marketplace', 'buy cards', 'sell cards', 'trading cards']
  },
  
  collection: {
    title: 'My Collection - Pokemon Card Manager',
    description: 'Manage your Pokemon card collection. Track cards, set values, organize by set, and mark cards for trading.',
    keywords: ['pokemon collection', 'card manager', 'organize cards', 'track value']
  },
  
  trades: {
    title: 'Trades - Pokemon Card Trading Hub',
    description: 'View and manage your Pokemon card trades. Propose trades, negotiate, and complete transactions safely.',
    keywords: ['pokemon trades', 'card trading', 'trade proposals', 'swap cards']
  },
  
  sets: {
    title: 'Pokemon Sets - Browse Card Sets',
    description: 'Explore Pokemon TCG sets from all generations. View cards, check completion status, and find missing cards.',
    keywords: ['pokemon sets', 'TCG sets', 'card sets', 'pokemon generations']
  },
  
  profile: {
    title: 'Profile - Trader Dashboard',
    description: 'View your trading profile, statistics, and activity. Manage preferences and track your trading history.',
    keywords: ['trader profile', 'trading stats', 'activity history', 'preferences']
  }
} as const;