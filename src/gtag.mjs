import storyCfg from './chapters/config.mjs';

window.dataLayer = window.dataLayer || [];
export default function gtag() {
  dataLayer.push(arguments);
}

if (typeof storyCfg.gtag === 'string') {
  gtag('js', new Date());

  gtag('config', storyCfg.gtag);
}
