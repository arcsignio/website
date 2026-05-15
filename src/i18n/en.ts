export const en = {
  // Navigation
  'nav.features': 'Features',
  'nav.security': 'Security',
  'nav.pricing': 'Pricing',
  'nav.faq': 'FAQ',
  'nav.download': 'Download',
  'nav.developer': 'Developer Mode',
  'nav.tutorial': 'Tutorial',
  'nav.blog': 'Blog',
  'nav.referral': 'Referral',
  'nav.changelog': 'Changelog',

  // Hero Section
  'hero.badge1': 'Portable Wallet',
  'hero.badge2': 'Zero Extra Cost',
  'hero.badge3': 'WalletConnect',
  'hero.title': 'Your Assets, ',
  'hero.title.gradient': 'Your Control',
  'hero.subtitle': 'No device lock-in, no company dependency, no extra cost.<br />App + private keys all on USB, use on any computer.',
  'hero.note': 'True plug-and-play — Unplug to stay safe',
  'hero.cta.download': 'Free Download',
  'hero.cta.security': 'Learn About Security',
  'hero.feature1.title': 'No Device Lock-in',
  'hero.feature1.desc': 'Use on any computer',
  'hero.feature2.title': 'No Company Dependency',
  'hero.feature2.desc': 'Keys only in your hands',
  'hero.feature3.title': 'No Extra Cost',
  'hero.feature3.desc': 'Use existing USB',
  'hero.usb.indicator': 'Private keys stored safely on USB',

  // Common
  'common.backHome': '← Back to Home',
  'common.backBlog': '← Back to Blog',
  'common.learnMore': 'Learn More',
  'common.download': 'Download Free',
} as const;

export type TranslationKey = keyof typeof en;
