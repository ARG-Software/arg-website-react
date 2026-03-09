import { useEffect, useRef } from 'react';

export default function ClientsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Add Webflow class
    const docEl = document.documentElement;
    if (!docEl.className.includes('w-mod-js')) {
      docEl.className += ' w-mod-js';
      if ('ontouchstart' in window) docEl.className += ' w-mod-touch';
    }

    // Load CSS
    const cssUrls = [
      'css/arg-staging-2cd0b9f16b9bd-c543d701aa025.webflow.a5d588191.min.css',
    ];
    cssUrls.forEach((href) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    });

    // Load Scripts
    const EXTERNAL_SCRIPTS = [
      'js/jquery.js',
      'js/webflow-script.js',
      'https://unpkg.com/lenis@1.1.3/dist/lenis.min.js',
    ];

    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });

    const loadScripts = async () => {
      for (const src of EXTERNAL_SCRIPTS) {
        try { await loadScript(src); } catch (e) { console.warn('Failed to load:', src); }
      }
    };

    const initLenis = () => {
      if (typeof window.Lenis === 'undefined') return;
      const lenis = new window.Lenis({
        lerp: 0.1, wheelMultiplier: 0.9,
        gestureOrientation: 'vertical', normalizeWheel: false, smoothTouch: false,
      });
      window.lenis = lenis;
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    };

    const initScrollAnimations = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.style.opacity = '1';
              entry.target.style.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
              entry.target.style.transition = 'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)';
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );

      document.querySelectorAll('.cp-reveal').forEach((el) => observer.observe(el));
    };

    const initMobileNav = () => {
      const hamburger = document.querySelector('.nav-hamburger');
      const menuWrapper = document.querySelector('.nav_menu-layout-wrapper');
      if (!hamburger || !menuWrapper) return;
      let isOpen = false;
      hamburger.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
        isOpen = !isOpen;
        if (isOpen) {
          menuWrapper.style.display = 'flex';
          requestAnimationFrame(() => { menuWrapper.classList.add('menu--open'); });
          document.body.style.overflow = 'hidden';
          if (window.lenis) window.lenis.stop();
          menuWrapper.querySelectorAll('.nav-link').forEach((link, i) => {
            link.style.opacity = '0';
            setTimeout(() => { link.style.transition = 'opacity 0.3s ease'; link.style.opacity = '1'; }, 100 + i * 50);
          });
        } else {
          menuWrapper.classList.remove('menu--open');
          menuWrapper.querySelectorAll('.nav-link').forEach((link) => { link.style.opacity = '0'; });
          setTimeout(() => {
            menuWrapper.style.display = 'none';
            document.body.style.overflow = '';
            if (window.lenis) window.lenis.start();
          }, 300);
        }
      }, true);
      menuWrapper.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', () => { if (isOpen) hamburger.click(); });
      });
    };

    const initCountUp = () => {
      document.querySelectorAll('.cp-count').forEach((el) => {
        const end = parseInt(el.getAttribute('data-end'), 10);
        const obs = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            obs.unobserve(el);
            const start = performance.now();
            const duration = 2000;
            const step = (now) => {
              const p = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              el.textContent = Math.floor(eased * end).toLocaleString();
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        }, { threshold: 0.5 });
        obs.observe(el);
      });
    };

    loadScripts().then(() => {
      setTimeout(() => {
        initLenis();
        initScrollAnimations();
        initCountUp();
        setTimeout(initMobileNav, 500);
      }, 300);
    });
  }, []);

  const arrowSvg = (
    <svg viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.77734 8.5L13.3329 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      <path d="M9.11133 3.83203L13.778 8.4987L9.11133 13.1654" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );

  const logoSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 62 33" fill="none" className="svg">
      <path d="M15.5309 4.98386C14.977 3.93989 14.1229 3.08584 13.0789 2.53187C11.9364 1.92027 10.6567 1.61049 9.36093 1.63187C7.62423 1.60033 5.91506 2.06858 4.43693 2.98086C3.00696 3.87926 1.86504 5.16939 1.14692 6.69787C0.366136 8.35873-0.0254702 10.1758 0.00191778 12.0109C-0.0303673 13.8477 0.345335 15.6688 1.10192 17.3429C1.79306 18.8591 2.90692 20.1438 4.30992 21.0429C5.79829 21.9655 7.52331 22.4343 9.27392 22.3919C10.5781 22.4072 11.8647 22.0906 13.0129 21.4719C14.0638 20.935 14.9366 20.1052 15.5259 19.0829V21.8619H21.7369V2.16186H15.5239L15.5309 4.98386ZM14.5499 15.7319C14.1226 16.2269 13.5871 16.6171 12.9849 16.8721C12.3826 17.1272 11.7299 17.2404 11.0769 17.2029C10.4363 17.2282 9.79807 17.1112 9.20809 16.8603C8.61812 16.6094 8.09109 16.2308 7.66493 15.7519C6.78114 14.7121 6.32191 13.3773 6.37892 12.0139C6.31996 10.6559 6.77972 9.32635 7.66493 8.29487C8.09454 7.82158 8.6227 7.44826 9.21221 7.20119C9.80173 6.95412 10.4382 6.83931 11.0769 6.86487C11.73 6.82734 12.3828 6.94058 12.9851 7.19584C13.5873 7.45109 14.1228 7.84151 14.5499 8.33687C15.3879 9.37537 15.8232 10.6813 15.7759 12.0149C15.8276 13.361 15.3924 14.6807 14.5499 15.7319Z" fill="currentColor"/>
      <path d="M42.0361 1.84085H37.5951C36.3129 1.83665 35.0692 2.27885 34.0775 3.09157C33.0858 3.90428 32.4079 5.03683 32.1601 6.29485V2.16785H25.9141V21.8679H32.1651V14.2679C32.0408 12.527 32.5011 10.7945 33.4731 9.34485C33.9438 8.78245 34.5409 8.33935 35.2155 8.05173C35.8902 7.7641 36.6233 7.6401 37.3551 7.68985C37.5371 7.68985 37.749 7.70085 37.955 7.71085L37.9651 7.67685C38.2118 6.87993 38.5371 6.10948 38.9361 5.37685C39.7114 3.99485 40.7674 2.79038 42.0361 1.84085Z" fill="currentColor"/>
      <path d="M45.0374 21.0679C46.8431 21.942 48.8233 22.3961 50.8294 22.3961C52.8356 22.3961 54.8157 21.942 56.6214 21.0679C58.2212 20.2307 59.5419 18.9448 60.4214 17.3679C61.2927 15.7192 61.7481 13.8826 61.7481 12.0179C61.7481 10.1531 61.2927 8.31657 60.4214 6.66788C60.1394 6.17669 59.8134 5.71211 59.4474 5.27988H61.7474V0.00488281L59.0074 1.32888L56.1004 2.72888C54.3473 1.97226 52.4518 1.60198 50.5428 1.64322C48.6339 1.68446 46.7562 2.13625 45.0374 2.96788C43.4302 3.80189 42.1023 5.08811 41.2174 6.66788C40.3461 8.31657 39.8906 10.1531 39.8906 12.0179C39.8906 13.8826 40.3461 15.7192 41.2174 17.3679C42.1012 18.9485 43.4294 20.235 45.0374 21.0679ZM47.3854 8.31288C48.3033 7.40921 49.5398 6.90272 50.8279 6.90272C52.116 6.90272 53.3525 7.40921 54.2704 8.31288C55.0925 9.37107 55.5387 10.6729 55.5387 12.0129C55.5387 13.3529 55.0925 14.6547 54.2704 15.7129C53.3525 16.6166 52.116 17.1231 50.8279 17.1231C49.5398 17.1231 48.3033 16.6166 47.3854 15.7129C46.5742 14.6491 46.1348 13.3482 46.1348 12.0104C46.1348 10.6725 46.5742 9.37172 47.3854 8.30788V8.31288Z" fill="currentColor"/>
      <path d="M55.1508 24.4308C54.9683 25.0276 54.6653 25.5806 54.2607 26.0558C53.3428 26.9595 52.1064 27.4659 50.8183 27.4659C49.5302 27.4659 48.2937 26.9595 47.3758 26.0558C46.9621 25.5642 46.6556 24.9916 46.4758 24.3748C46.4218 24.2088 46.3468 24.0588 46.3068 23.8838H39.9688C40.125 25.2278 40.5436 26.528 41.2007 27.7108C42.0848 29.2912 43.4129 30.5776 45.0208 31.4108C46.8266 32.2844 48.8067 32.7382 50.8127 32.7382C52.8188 32.7382 54.7989 32.2844 56.6048 31.4108C58.2045 30.5736 59.5252 29.2877 60.4048 27.7108C61.0619 26.528 61.4805 25.2278 61.6367 23.8838H55.3368C55.2847 24.0693 55.2226 24.2519 55.1508 24.4308Z" fill="url(#paint0_linear_clients)"/>
      <defs>
        <linearGradient id="paint0_linear_clients" x1="39.9688" y1="28.311" x2="61.6367" y2="28.311" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0060D"/><stop offset="0.494" stopColor="#C924D7"/><stop offset="1" stopColor="#7904FD"/>
        </linearGradient>
      </defs>
    </svg>
  );

const linkedinSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>LinkedIn</title>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );

  const githubSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>GitHub icon</title>
      <path d="M12,2.2467A10.00042,10.00042,0,0,0,8.83752,21.73419c.5.08752.6875-.21247.6875-.475,0-.23749-.01251-1.025-.01251-1.86249C7,19.85919,6.35,18.78423,6.15,18.22173A3.636,3.636,0,0,0,5.125,16.8092c-.35-.1875-.85-.65-.01251-.66248A2.00117,2.00117,0,0,1,6.65,17.17169a2.13742,2.13742,0,0,0,2.91248.825A2.10376,2.10376,0,0,1,10.2,16.65923c-2.225-.25-4.55-1.11254-4.55-4.9375a3.89187,3.89187,0,0,1,1.025-2.6875,3.59373,3.59373,0,0,1,.1-2.65s.83747-.26251,2.75,1.025a9.42747,9.42747,0,0,1,5,0c1.91248-1.3,2.75-1.025,2.75-1.025a3.59323,3.59323,0,0,1,.1,2.65,3.869,3.869,0,0,1,1.025,2.6875c0,3.83747-2.33752,4.6875-4.5625,4.9375a2.36814,2.36814,0,0,1,.675,1.85c0,1.33752-.01251,2.41248-.01251,2.75,0,.26251.1875.575.6875.475A10.0053,10.0053,0,0,0,12,2.2467Z" />
    </svg>
  );

  const mediumSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Medium icon</title>
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.11-.53 5.62-1.18 5.62-.66 0-1.18-2.51-1.18-5.62s.52-5.62 1.18-5.62c.65 0 1.18 2.51 1.18 5.62z" />
    </svg>
  );

  const PROJECTS = [
    {
      title: 'Mojaloop', subtitle: 'Fintech', idx: '01',
      img: 'images/file.jpg', mockup: 'images/mojaloop-mobile-.png',
      link: 'https://mojaloop.io/',
      problem: "The implementation of Mojaloop's financial hub faced challenges at the intersection of technology, finance, and inclusivity. Ensuring seamless interoperability among diverse financial systems required overcoming technical hurdles like harmonizing protocols, maintaining data integrity, and handling high transaction volumes in unstable network conditions. Additionally, compliance with varied cultural, regulatory, and economic frameworks complicated the mission of fostering financial inclusion while maintaining stakeholder trust and credibility.",
      solutionBold: 'ARG Software was invited to cooperate in a new version for the open-source solution that made digital payments easy and affordable for people and organizations worldwide.',
      solution: "Mojaloop's vNext implementation enhanced scalability, security, and modularity through an updated tech stack and microservices architecture to address these challenges. Real-time transaction settlement was implemented to reduce delays, and advanced security measures safeguarded sensitive data. Regulatory compliance tools were developed, and the user experience was improved with a more intuitive and accessible interface. Interoperability was expanded globally by fostering partnerships, while comprehensive resources enriched developer ecosystems.",
      stack: 'Express, MongoDb, Kafka, Angular, Docker, Jest, Node',
      logos: ['images/group-203069.svg','images/group-203066.svg','images/path-20825.svg','images/group-203061.svg','images/group-203065.svg'],
      testimonial: { quote: 'It was a pleasure to work with! Good communication solid work and helped us deliver our new version of the product in a timely fashionable way.', author: 'Marc-André Mignault', role: 'Project Manager at Skytracks' },
    },
    {
      title: 'Dokutar', subtitle: 'Digital Marketing', idx: '02',
      img: 'images/file-20-1-.jpg', mockup: 'images/dokutar.png',
      link: 'https://www.dokutar.de',
      problem: "Dokutar aimed to help businesses of all sizes streamline their tax processes while maintaining full GDPR compliance. Their mission was to offer a secure, user-friendly platform that could save time and reduce costs. However, their current solution was restricted by scalability limitations. They needed to migrate from WordPress to a more robust, dedicated backend.",
      solutionBold: 'ARG Software worked with MbNetzwerk to develop a more intuitive interface and efficient backend, making tax management as simple as point and click.',
      solution: "The tax documentation software successfully addressed all key challenges, delivering a secure, efficient, and user-friendly cloud-based solution for managing tax processes. It enabled seamless document storage and organization, with automated data capture reducing manual entry errors. Workflow automation guided users through the tax documentation process, ensuring compliance and accuracy at every step.",
      stack: 'TypeOrm, Express, React, Docker, Jest, MySQL, Node',
      logos: ['images/group-203114.svg','images/group-203069.svg','images/group-203113.svg','images/group-203065.svg','images/group-203067.svg'],
      testimonial: { quote: 'Jose and Rui delivered good work and I enjoyed working with them. They transformed a legacy api from PHP to Typescript, where their architectural skills were really handy.', author: 'Hendrik', role: 'CTO at Dokutar' },
    },
    {
      title: 'Sky Tracks', subtitle: 'Music Tech', idx: '03',
      img: 'images/file-20-2-.jpg', mockup: 'images/mockup.png',
      link: 'https://skytracks.io/',
      problem: "Skytracks aimed to develop a cloud-based music production studio that allows musicians, producers, and audio engineers to collaborate online. This required implementing real-time collaboration tools, virtual instruments, cloud storage, an integrated digital audio workstation, audio effects, and sample libraries — all while maintaining low latency and a user-friendly interface.",
      solutionBold: 'ARG Software partnered with SkyTracks to help developing a new leading, cloud-based music production suite.',
      solution: "Skytracks successfully launched a cloud-based music studio by leveraging scalable cloud services to host its components. Real-time collaboration was enabled through low-latency streaming technologies like WebRTC. A rich library of virtual instruments, effects, and sample libraries was integrated into an intuitive DAW accessible via web browsers.",
      stack: 'Knex, Tone.js, Tailwind, Kpa, Angular, Docker, Jest, Node',
      logos: ['images/group-203152.svg','images/group-203061.svg','images/group-203065.svg','images/group-203067.svg','images/group-203111.svg'],
      testimonial: { quote: 'It was a pleasure to work with! Good communication solid work and helped us deliver our new version of the product in a timely fashionable way.', author: 'Marc-André Mignault', role: 'Project Manager at Skytracks' },
    },
    {
      title: 'TV Cine', subtitle: 'Fintech', idx: '04',
      img: 'images/file-20-3-.jpg', mockup: 'images/tvcine.png',
      link: 'https://www.tvcine.pt/',
      problem: "TvCine encountered significant challenges in implementing and maintaining features for its frontend and backoffice systems. The frontend required a user-friendly, intuitive interface while ensuring cross-browser and cross-device compatibility. Responsiveness and performance optimization were critical for delivering a seamless user experience.",
      solutionBold: 'By combining digital expertise with innovative technology, the new platform exceeded key performance indicators and highly improved user engagement.',
      solution: "TvCine successfully addressed all challenges. The frontend was designed to be intuitive, responsive, and compatible across devices and browsers. Comprehensive user training facilitated the smooth adoption of new features, while ongoing maintenance ensured the system's reliability and adaptability.",
      stack: 'Vue.js, MongoDb, Entity Framework, .Net Core, Nuxt',
      logos: ['images/group-203118.svg','images/group-203066.svg','images/entity-20framework.svg','images/group-203157.svg','images/g862.svg'],
      testimonial: null,
    },
    {
      title: 'Royalty Flush', subtitle: 'Music Tech — CWR', idx: '05',
      img: 'images/royalty_flash.jpg', mockup: 'images/rf_mockup.png',
      link: 'https://www.northmusicgroup.com/',
      problem: "Developing a music rights management platform presented several challenges due to the complexity of managing music catalogs, tracking royalties, and enforcing rights. Key requirements included organizing extensive metadata, calculating royalties from diverse revenue streams, and facilitating licensing processes for media usage.",
      solutionBold: 'ARG Software teamed up with North Music Group to create an innovative platform that simplified music rights management.',
      solution: "The platform provided catalog management with detailed metadata and automated royalty tracking to ensure accurate and transparent calculations. Licensing and rights enforcement tools streamlined the process of granting permissions and protecting intellectual property.",
      stack: '.Net Core, Entity Framework, Octopus Deploy, Docker, React, Hangfire, PostgreSQL, MediatR',
      logos: ['images/group-203156.svg','images/entity-20framework.svg','images/group-203120.svg','images/group-203065.svg','images/group-203121.svg'],
      testimonial: null,
    },
    {
      title: 'Vector', subtitle: 'Fintech', idx: '06',
      img: 'images/vector.jpg', mockup: 'images/vector_m.png',
      link: 'https://quantapes.com/',
      problem: "The application arrived in a completely non-functional state. The UI was merely illustrative and lacked connection to the backend. It needed to allow a crypto community to integrate their exchanges and automate trades based on pre-defined signals.",
      solutionBold: 'ARG Software created a digital solution where, besides connecting every dot, commands worked at first and made sense.',
      solution: "The backend was completely rebuilt from the ground up, leveraging a new technology stack to ensure functionality, efficiency, and reliability. Within just a few months, the reworked application met its objectives, connecting the UI to a fully operational backend.",
      stack: 'MikroOrm, Next, Kafka, PostgreSQL, Docker, Nx, Webpack, Nest.js',
      logos: ['images/mikrorm.svg','images/g862.svg','images/path-20825.svg','images/group-203124.svg','images/group-203065.svg'],
      testimonial: { quote: "ARG did great! Was awesome to work with and always quick to respond. Great attitude despite project requirements changing — highly recommend working with ARG!", author: 'Austin Klise', role: 'CEO at Klise Consulting' },
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --black: #1a1a1a;
          --white: #f6f6f7;
          --gray: #ededed;
          --dark-gray: #888;
          --gradient: linear-gradient(90deg, #F0060D, #C924D7, #7904FD);
          --font-h: 'Syne', sans-serif;
          --font-b: 'DM Sans', sans-serif;
          --ease: cubic-bezier(0.16, 1, 0.3, 1);
        }

        html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
        body { font-family: var(--font-b); color: var(--black); background: #fff; line-height: 1.6; overflow-x: hidden; }
        a { color: inherit; text-decoration: none; }
        img { max-width: 100%; display: block; }
        button { border: none; background: none; cursor: pointer; font: inherit; }

        /* ── Layout ── */
        .cp-container { max-width: 1200px; margin: 0 auto; padding: 0 2.5rem; }

        /* ── Reveal animation ── */
        .cp-reveal { opacity: 0; transform: translateY(2.5rem); transition: opacity 0.9s var(--ease), transform 0.9s var(--ease); }
        .cp-reveal.cp-delay-1 { transition-delay: 0.1s; }
        .cp-reveal.cp-delay-2 { transition-delay: 0.2s; }
        .cp-reveal.cp-delay-3 { transition-delay: 0.3s; }
        .cp-reveal.cp-delay-4 { transition-delay: 0.4s; }

        /* ── Nav override ── */
        .cp-page .nav_wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; }
        .nav_menu-layout-wrapper {
          display: none; position: fixed; inset: 0; z-index: 100;
          flex-direction: column; justify-content: center; align-items: center;
          background: rgba(20, 17, 52, 0.97); backdrop-filter: blur(12px);
          transition: opacity 0.3s ease; opacity: 0;
        }
        .nav_menu-layout-wrapper.menu--open { opacity: 1; }
        .nav_menu-layout-wrapper .nav_menu-layout {
          display: flex; flex-direction: column; align-items: flex-start; padding: 2rem; width: 100%; max-width: 400px;
        }
        .nav_menu-layout-wrapper .nav-link {
          display: block; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.15);
          width: 100%; color: #fff; font-size: 1rem; opacity: 0;
        }

        /* ── Hero ── */
        .cp-hero {
          min-height: 70vh; display: flex; align-items: flex-end; padding: 10rem 0 5rem;
          background: var(--black); color: var(--white); position: relative; overflow: hidden;
        }
        .cp-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 20% 80%, rgba(121,4,253,0.15), transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(240,6,13,0.1), transparent 60%);
        }
        .cp-hero-inner { position: relative; z-index: 2; width: 100%; }
        .cp-hero-tag {
          display: inline-block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.15em; padding: 0.5rem 1.25rem; border: 1px solid rgba(255,255,255,0.25);
          border-radius: 100px; margin-bottom: 2rem; color: rgba(255,255,255,0.7);
        }
        .cp-hero h1 {
          font-family: var(--font-h); font-size: clamp(2.75rem, 6vw, 5.5rem);
          font-weight: 700; line-height: 1.08; letter-spacing: -0.03em; max-width: 900px;
        }
        .cp-hero h1 span { background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .cp-hero-sub {
          margin-top: 2rem; font-size: 1.125rem; color: rgba(255,255,255,0.6);
          max-width: 550px; line-height: 1.7;
        }
        .cp-hero-stats {
          display: flex; gap: 4rem; margin-top: 4rem; padding-top: 2.5rem;
          border-top: 1px solid rgba(255,255,255,0.12);
        }
        .cp-stat-num {
          font-family: var(--font-h); font-size: clamp(2rem, 4vw, 3.25rem);
          font-weight: 700; line-height: 1;
        }
        .cp-stat-label { font-size: 0.8125rem; color: rgba(255,255,255,0.5); margin-top: 0.5rem; }

        /* ── Separator ── */
        .cp-sep { height: 1px; background: rgba(0,0,0,0.1); }
        .cp-sep.dark { background: rgba(255,255,255,0.1); }

        /* ── Case Study ── */
        .cp-case { padding: 7rem 0; }
        .cp-case:nth-child(even) { background: var(--gray); }

        .cp-case-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 4rem; gap: 2rem; flex-wrap: wrap;
        }
        .cp-case-idx {
          font-family: var(--font-h); font-size: 0.875rem; font-weight: 700;
          color: var(--dark-gray); margin-bottom: 0.5rem;
        }
        .cp-case-title {
          font-family: var(--font-h); font-size: clamp(2.25rem, 4.5vw, 3.75rem);
          font-weight: 700; letter-spacing: -0.02em; line-height: 1.1;
        }
        .cp-case-industry {
          display: inline-block; font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.1em; padding: 0.45rem 1.1rem;
          border: 1px solid rgba(0,0,0,0.15); border-radius: 100px;
          white-space: nowrap; margin-top: 0.75rem;
        }

        .cp-case-hero-img {
          width: 100%; aspect-ratio: 16/8; object-fit: cover; border-radius: 1rem;
          margin-bottom: 4rem;
        }

        .cp-case-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 4rem;
          margin-bottom: 4rem;
        }

        .cp-label {
          font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.12em; color: var(--dark-gray); margin-bottom: 1rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .cp-label::before {
          content: ''; width: 20px; height: 1px; background: var(--dark-gray);
        }

        .cp-case-text { font-size: 1rem; line-height: 1.75; color: #444; }
        .cp-case-bold { font-weight: 700; color: var(--black); font-size: 1.0625rem; line-height: 1.6; margin-bottom: 1rem; }

        .cp-mockup-area { display: flex; justify-content: center; margin: 3rem 0; }
        .cp-mockup-img { max-width: 350px; width: 100%; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.12)); }

        .cp-stack-area {
          display: flex; flex-wrap: wrap; align-items: center; gap: 1rem;
          padding: 2rem 0; border-top: 1px solid rgba(0,0,0,0.08);
        }
        .cp-stack-label { font-weight: 700; font-size: 0.875rem; margin-right: 0.5rem; }
        .cp-stack-tag {
          font-size: 0.8125rem; padding: 0.4rem 0.9rem; border-radius: 100px;
          background: rgba(0,0,0,0.06); color: #555;
        }

        .cp-logos {
          display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
          padding: 1.5rem 0;
        }
        .cp-logos img { height: 22px; width: auto; opacity: 0.5; }

        .cp-visit-link {
          display: inline-flex; align-items: center; gap: 0.5rem;
          font-weight: 600; font-size: 0.9375rem; margin-top: 1.5rem;
          border-bottom: 1.5px solid var(--black); padding-bottom: 0.15rem;
          transition: gap 0.3s var(--ease);
        }
        .cp-visit-link:hover { gap: 0.75rem; }
        .cp-visit-link svg { width: 16px; height: 16px; }

        /* ── Testimonial inline ── */
        .cp-testimonial {
          margin-top: 3rem; padding: 2.5rem; border-radius: 1rem;
          background: var(--black); color: var(--white); position: relative;
        }
        .cp-case:nth-child(even) .cp-testimonial { background: #222; }
        .cp-testimonial::before {
          content: '"'; font-family: var(--font-h); font-size: 5rem;
          position: absolute; top: 0.25rem; left: 1.5rem; color: rgba(255,255,255,0.08);
          line-height: 1;
        }
        .cp-testimonial-quote { font-size: 1rem; line-height: 1.7; font-style: italic; color: rgba(255,255,255,0.85); }
        .cp-testimonial-author { margin-top: 1.25rem; font-size: 0.8125rem; color: rgba(255,255,255,0.5); }
        .cp-testimonial-author strong { color: rgba(255,255,255,0.8); font-weight: 600; }

        /* ── CTA ── */
        .cp-cta {
          padding: 8rem 0; text-align: center; background: var(--black); color: var(--white);
          position: relative; overflow: hidden;
        }
        .cp-cta::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(201,36,215,0.12), transparent 60%);
        }
        .cp-cta-inner { position: relative; z-index: 2; }
        .cp-cta h2 {
          font-family: var(--font-h); font-size: clamp(2.5rem, 5.5vw, 4.5rem);
          font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 1rem;
        }
        .cp-cta h2 span { background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .cp-cta-sub { color: rgba(255,255,255,0.5); font-size: 1.0625rem; margin-bottom: 2.5rem; }

        .cp-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: var(--white); color: var(--black); padding: 0.85rem 2rem;
          border-radius: 100px; font-weight: 600; font-size: 0.9375rem;
          transition: transform 0.3s var(--ease), box-shadow 0.3s;
        }
        .cp-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
        .cp-btn svg { width: 16px; height: 16px; }

        /* ── Footer ── */
        .cp-footer {
          background: var(--black); color: var(--white); padding: 0 0 2rem;
        }
        .cp-footer-inner {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 1.5rem; font-size: 0.8125rem; color: rgba(255,255,255,0.5);
        }
        .cp-footer-socials { display: flex; gap: 1rem; }
        .cp-footer-socials a { color: rgba(255,255,255,0.5); transition: color 0.3s; }
        .cp-footer-socials a:hover { color: #fff; }
        .cp-footer-socials svg { width: 18px; height: 18px; }

        /* ── Responsive ── */
        @media (max-width: 991px) {
          .cp-case-grid { grid-template-columns: 1fr; gap: 2.5rem; }
          .cp-hero-stats { gap: 2.5rem; flex-wrap: wrap; }
        }
        @media (max-width: 767px) {
          .cp-container { padding: 0 1.25rem; }
          .cp-case { padding: 4rem 0; }
          .cp-case-header { flex-direction: column; }
          .cp-hero-stats { gap: 2rem; }
          .cp-footer-inner { flex-direction: column; gap: 1rem; text-align: center; }
        }
        @media (max-width: 479px) {
          .cp-hero { padding: 8rem 0 3rem; min-height: auto; }
          .cp-hero-stats { flex-direction: column; gap: 1.5rem; }
        }
      `}} />

      <div className="cp-page">

        {/* ══════ NAV (same as main site) ══════ */}
        <div data-animation="default" className="nav_wrap padding-global w-nav" data-easing2="ease-in" data-easing="ease-in" data-collapse="all" data-w-id="308eecff-d20f-93cb-5c2c-98b23333700a" role="banner" data-duration="400">
          <div className="nav_contain container">
            <div className="nav-component" style={{ opacity: 1 }}>
              <a aria-label="Arg Software" href="/" className="nav_logo-wrapper w-nav-brand">
                <div className="nav_logo_icon">{logoSvg}</div>
              </a>
              <div style={{ display: 'none' }} className="nav_menu-layout-wrapper">
                <div className="nav_menu-layout">
                  {['About','Services','Our Work','Testimonials','Working with Us','Team','Social','Contact'].map((label) => (
                    <a key={label} href={`/#${label.toLowerCase().replace(/ /g, '-')}`} className="nav-link w-nav-link">{label}</a>
                  ))}
                </div>
              </div>
              <div className="nav_buttons-wrapper">
                <a href="https://zcal.co/argsoftware/project" target="_blank" rel="noopener noreferrer" className="button-base w-inline-block">
                  <div className="button-base_text_wrap">
                    <div className="button-base__button-text">Book a Meeting</div>
                    <div className="button-base__button-text is-animated">No commitment</div>
                  </div>
                </a>
                <div className="nav-hamburger w-nav-button">
                  <div className="menu-icon z-index-2">
                    <div className="menu_icon-line is--top"></div>
                    <div className="menu_icon-line is--bottom"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ HERO ══════ */}
        <section className="cp-hero">
          <div className="cp-container cp-hero-inner">
            <div className="cp-hero-tag cp-reveal">Case Studies</div>
            <h1 className="cp-reveal cp-delay-1">They trusted us.<br /><span>It's your time now.</span></h1>
            <p className="cp-hero-sub cp-reveal cp-delay-2">Real challenges. Real solutions. Explore how we've helped businesses across fintech, music tech, and digital marketing build products that last.</p>
            <div className="cp-hero-stats cp-reveal cp-delay-3">
              <div>
                <div className="cp-stat-num"><span className="cp-count" data-end="6">0</span>+</div>
                <div className="cp-stat-label">Impacted countries</div>
              </div>
              <div>
                <div className="cp-stat-num"><span className="cp-count" data-end="2000">0</span>+</div>
                <div className="cp-stat-label">Transactions per second</div>
              </div>
              <div>
                <div className="cp-stat-num"><span className="cp-count" data-end="1000">0</span>+</div>
                <div className="cp-stat-label">Deploys into production</div>
              </div>
              <div>
                <div className="cp-stat-num"><span className="cp-count" data-end="25">0</span>+</div>
                <div className="cp-stat-label">Years experience combined</div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════ CASE STUDIES ══════ */}
        {PROJECTS.map((p, i) => (
          <section key={i} className="cp-case">
            <div className="cp-container">
              {/* Header */}
              <div className="cp-case-header cp-reveal">
                <div>
                  <div className="cp-case-idx">{p.idx}</div>
                  <h2 className="cp-case-title">{p.title}</h2>
                  <div className="cp-case-industry">{p.subtitle}</div>
                </div>
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="cp-visit-link">
                  Visit Live Site {arrowSvg}
                </a>
              </div>

              {/* Hero image */}
              <img src={p.img} alt={p.title} className="cp-case-hero-img cp-reveal" loading="lazy" />

              {/* Problem / Solution grid */}
              <div className="cp-case-grid">
                <div className="cp-reveal">
                  <div className="cp-label">The Challenge</div>
                  <p className="cp-case-text">{p.problem}</p>
                </div>
                <div className="cp-reveal cp-delay-1">
                  <div className="cp-label">Our Solution</div>
                  <p className="cp-case-bold">{p.solutionBold}</p>
                  <p className="cp-case-text">{p.solution}</p>
                </div>
              </div>

              {/* Mockup */}
              <div className="cp-mockup-area cp-reveal">
                <img src={p.mockup} alt={`${p.title} mockup`} className="cp-mockup-img" loading="lazy" />
              </div>

              {/* Tech stack */}
              <div className="cp-stack-area cp-reveal">
                <span className="cp-stack-label">Tech Stack:</span>
                {p.stack.split(', ').map((t) => (
                  <span key={t} className="cp-stack-tag">{t}</span>
                ))}
              </div>

              {/* Logos */}
              <div className="cp-logos cp-reveal">
                {p.logos.map((logo, j) => (
                  <img key={j} src={logo} alt="" loading="lazy" />
                ))}
              </div>

              {/* Testimonial */}
              {p.testimonial && (
                <div className="cp-testimonial cp-reveal">
                  <p className="cp-testimonial-quote">{p.testimonial.quote}</p>
                  <div className="cp-testimonial-author">
                    <strong>{p.testimonial.author}</strong> — {p.testimonial.role}
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}

        {/* ══════ CTA ══════ */}
        <section className="cp-cta">
          <div className="cp-container cp-cta-inner">
            <h2 className="cp-reveal">Ready to elevate<br /><span>your digital experience?</span></h2>
            <p className="cp-cta-sub cp-reveal cp-delay-1">Let's discuss your project and build something remarkable together.</p>
            <a href="https://zcal.co/argsoftware/project" target="_blank" rel="noopener noreferrer" className="cp-btn cp-reveal cp-delay-2">
              Book a Meeting {arrowSvg}
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="container-medium footer-container padding-global">
            <div className="line-separate is--footer"></div>
            <div className="footer_copywrite-content">
              <div className="overflow-hidden">
                <div className="hide-mobile-landscape">© Arg 2025. All Rights Reserved</div>
              </div>
              <div className="footer_copywrite-buttons">
<a aria-label="Linkedin" href="https://www.linkedin.com/company/arg-software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{linkedinSvg}</div>
                </a>
                <a aria-label="Github" href="https://github.com/ARG-Software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{githubSvg}</div>
                </a>
                <a aria-label="Medium" href="https://medium.com/@arg-software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{mediumSvg}</div>
                </a>
              </div>
              <div className="footer_copywrite-text-mobile">
                <div className="text-block-2">Arg is based in Funchal and Porto, Portugal</div>
                <div className="show-mobile-landscape">© Arg 2025. All Rights Reserved</div>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
