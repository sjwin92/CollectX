// App Configuration
export const APP_CONFIG = {
  // App Info
  name: 'PokéTrade Hub',
  description: 'The ultimate platform for Pokemon card trading, collection management, and marketplace interactions.',
  version: '1.0.0',
  
  // URLs
  baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  apiUrl: 'https://api.pokemontcg.io/v2',
  
  // Supabase
  supabase: {
    url: 'https://kitejduabjzmhraiyzre.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdGVqZHVhYmp6bWhyYWl5enJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjczNjcsImV4cCI6MjA2OTU0MzM2N30.CYRsGXRWi3EKXaK8bG6WpeWKM8M8R__l0TcrrBwaCWc'
  },
  
  // Features
  features: {
    realTimeUpdates: true,
    notifications: true,
    analytics: true,
    fileUploads: true,
    offlineMode: false,
    darkMode: true
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
    cardGridPageSize: 24,
    tradeHistoryPageSize: 50
  },
  
  // File Upload Limits
  fileUpload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles: 10
  },
  
  // Search Configuration
  search: {
    debounceMs: 300,
    minQueryLength: 2,
    maxRecentSearches: 10,
    maxSuggestions: 8
  },
  
  // Cache Configuration
  cache: {
    queryStaleTime: 5 * 60 * 1000, // 5 minutes
    queryCacheTime: 10 * 60 * 1000, // 10 minutes
    imageCacheTime: 60 * 60 * 1000, // 1 hour
    staticCacheTime: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // Animation Settings
  animation: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    reduceMotion: false
  },
  
  // Security
  security: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    csrfProtection: true
  },
  
  // Analytics
  analytics: {
    trackPageViews: true,
    trackUserActions: true,
    trackErrors: true,
    trackPerformance: true,
    sessionRecording: false
  },
  
  // SEO
  seo: {
    siteName: 'PokéTrade Hub',
    siteDescription: 'Trade Pokemon cards, manage your collection, and connect with fellow collectors.',
    keywords: ['pokemon', 'cards', 'trading', 'collection', 'marketplace', 'tcg'],
    author: 'PokéTrade Hub Team',
    twitterSite: '@poketradehub',
    ogImage: '/og-image.png',
    favicon: '/favicon.ico'
  },
  
  // Social Links
  social: {
    twitter: 'https://twitter.com/poketradehub',
    discord: 'https://discord.gg/poketradehub',
    reddit: 'https://reddit.com/r/poketradehub',
    github: 'https://github.com/poketradehub'
  },
  
  // Support
  support: {
    email: 'support@poketradehub.com',
    helpUrl: '/help',
    contactUrl: '/contact',
    statusUrl: 'https://status.poketradehub.com'
  }
} as const;

// Environment-specific overrides
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Development-specific config
if (isDevelopment) {
  // Override settings for development
  (APP_CONFIG as any).cache.queryStaleTime = 1000; // 1 second
  (APP_CONFIG as any).analytics.trackUserActions = false;
}

// Type exports for configuration
export type AppConfig = typeof APP_CONFIG;
export type FeatureFlags = typeof APP_CONFIG.features;