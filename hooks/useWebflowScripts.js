import { useEffect } from 'react';

export const useWebflowScripts = () => {
  useEffect(() => {
    // Webflow touch detection
    !function(o,c){
      var n=c.documentElement,t=" w-mod-";
      n.className+=t+"js";
      ("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch")
    }(window,document);

    // Load external scripts
    const scripts = [
      { src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-numbercount@1/numbercount.js', defer: true },
      { src: 'https://cdn.jsdelivr.net/gh/Flowappz/cookie-consent-cdn@v1.1.15/cookie-consent.js' },
      { src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-scrolldisable@1/scrolldisable.js', defer: true },
      { src: 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js' },
      { src: 'https://unpkg.com/lenis@1.1.3/dist/lenis.min.js' },
      { src: 'https://static.elfsight.com/platform/platform.js', async: true }
    ];

    const loadedScripts = [];

    scripts.forEach(({ src, defer, async }) => {
      const script = document.createElement('script');
      script.src = src;
      if (defer) script.defer = true;
      if (async) script.async = true;
      document.body.appendChild(script);
      loadedScripts.push(script);
    });

    return () => {
      loadedScripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, []);
};
