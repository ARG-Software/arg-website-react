# Rich Content + GSAP Animations for Project Detail Pages

## Problem
Current project content is too brief and lacks engagement. The rui-rocha.com portfolio has much richer descriptions, and the page needs interactive animations to match the quality.

## Solution
1. Rewrite projects.json with rich, engaging content synthesized from BOTH sources (user-provided structured data + rui-rocha.com portfolio content)
2. Add GSAP-powered scroll animations to ProjectDetailPage
3. Make each section feel alive with scroll-triggered reveals, parallax effects, and staggered animations

---

## Step 1: Rich Content for All Projects

### Content Strategy
- **Challenge**: Combine the user's concise problem statement with the detailed context from rui-rocha.com. Write it as a compelling narrative (2-3 paragraphs) that sets up the stakes.
- **Solution**: Use the user's bullet points as the core, but expand each with the technical depth from rui-rocha.com. Each bullet should be a complete, meaningful statement.
- **Impact**: Write a strong, results-focused statement that shows the real-world outcome.

### Full Project Data

#### 1. Mojaloop

```json
{
  "slug": "mojaloop",
  "title": "Mojaloop",
  "subtitle": "Fintech",
  "client": "Mojaloop",
  "timeline": "Ongoing",
  "services": ["Backend", "Frontend", "CI/CD", "QA & Testing"],
  "imgSrc": "/images/file.jpg",
  "imgSrcSet": "/images/file-p-500.jpg 500w, /images/file-p-800.jpg 800w, /images/file-p-1080.jpg 1080w, /images/file-p-1600.jpg 1600w",
  "mockupSrc": "/images/mojaloop-mobile-.png",
  "mockupSrcSet": "/images/mojaloop-mobile-p-500.png 500w, images/mojaloop-mobile-p-800.png 800w, images/mojaloop-mobile-p-1080.png 1080w, images/mojaloop-mobile-p-1600.png 1600w, images/mojaloop-mobile-.png 2000w",
  "liveLink": "https://mojaloop.io/",
  "intro": "An open-source platform designed to foster financial inclusion on a global scale — connecting diverse financial systems and enabling seamless, secure digital transactions for underserved populations.",
  "challenge": "Mojaloop's mission to bring financial inclusion to underserved regions meant building a platform that could interconnect diverse financial systems across countries, while meeting high standards for performance, security, and regulation.\n\nThe implementation presented a multifaceted challenge at the intersection of technology, finance, and inclusivity. Ensuring seamless connectivity across disparate payment systems demanded the creation of a robust, scalable, and secure architecture — harmonizing divergent technologies, protocols, and data formats while maintaining data integrity and privacy.\n\nHandling high-volume transactions in a fault-tolerant manner, while considering low-bandwidth or unstable network conditions, added another layer of complexity. The mission extended beyond technology to address cultural, regulatory, and economic variations across regions — ensuring compliance with local regulations while promoting trust among financial institutions, mobile network operators, and users.",
  "solution": [
    "Upgraded the technology stack to ensure scalability, security, and performance — adopting the latest versions of programming languages, databases, and infrastructure components to accommodate growing transaction volumes",
    "Refined the architecture to be more modular and extensible using microservices, enabling agile development and scalability while maintaining interoperability standards",
    "Implemented real-time transaction settlement to reduce delays and improve user experience, integrating instant payment systems for swift and secure fund transfers",
    "Prioritized robust security measures including advanced encryption, multi-factor authentication, and biometric verification — with regular security audits to safeguard sensitive financial data",
    "Developed tools and features that assist financial institutions in adhering to evolving regulatory standards across different jurisdictions, including automated reporting, KYC/AML processes, and audit trails",
    "Enhanced the user experience by improving the platform's interface, ensuring it's intuitive and accessible to diverse user groups with localization and assistive technology support",
    "Provided comprehensive documentation, SDKs, and APIs to encourage third-party developers to build upon the Mojaloop platform and foster an active developer community",
    "Created a detailed migration plan ensuring a smooth transition from the current version to vNext, including data migration strategies, backward compatibility considerations, and a phased rollout approach"
  ],
  "impact": "Enabled seamless digital payments across borders, empowering people in developing regions to access financial tools through mobile money, banking apps, and fintech — transforming the landscape of inclusive finance.",
  "logos": [
    { "src": "/images/group-203069.svg", "name": "Express" },
    { "src": "/images/group-203066.svg", "name": "MongoDB" },
    { "src": "/images/path-20825.svg", "name": "Kafka" },
    { "src": "/images/group-203061.svg", "name": "Angular" },
    { "src": "/images/group-203065.svg", "name": "Docker" }
  ],
  "stack": "Express, MongoDb, Kafka, Angular, Docker, Jest, Node"
}
```

#### 2. Dokutar

```json
{
  "slug": "dokutar",
  "title": "Dokutar",
  "subtitle": "Digital Marketing",
  "client": "MbNetzwerk",
  "timeline": "2 Years",
  "services": ["Backend", "Frontend", "CI/CD", "QA & Testing"],
  "imgSrc": "/images/file-20-1-.jpg",
  "imgSrcSet": "/images/file-20-1-p-500.jpg 500w, /images/file-20-1-p-800.jpg 800w, /images/file-20-1-p-1080.jpg 1080w, /images/file-20-1-p-1600.jpg 1600w",
  "mockupSrc": "/images/dokutar.png",
  "mockupSrcSet": "/images/dokutar-p-500.png 500w, images/dokutar-p-800.png 800w, images/dokutar-p-1080.png 1080w, images/dokutar-p-1600.png 1600w, images/dokutar.png 2000w",
  "liveLink": "https://www.dokutar.de",
  "intro": "A cloud-based software for creating process documentation — guiding freelancers and entrepreneurs through complex tax compliance with ease, saving time and money for the next audit.",
  "challenge": "Designing a modern tax documentation platform tailored for businesses in Germany, with emphasis on local compliance, stability, and scalability.\n\nThe challenge was to create a digital tool that streamlines and manages the documentation and compliance processes related to taxation. The platform needed to securely store and organize tax-related documents — financial records, invoices, receipts, and tax forms — in a cloud-based environment with automatic data capture and extraction to reduce manual entry errors.\n\nWorkflow automation was critical: guiding users through the tax documentation process, ensuring all necessary steps are completed, with real-time collaboration capabilities for colleagues and tax professionals. The system also needed robust security measures including data encryption, access controls, detailed audit trails, and full compliance with German tax regulations and standards.",
  "solution": [
    "Rebuilt the backend from scratch using a secure, scalable architecture — implementing cloud-based document storage with automatic data capture and extraction to eliminate manual entry errors",
    "Implemented a point-and-click UI that simplifies documentation workflows — guiding users through complex tax questions with contextual explanations and support at crucial decision points",
    "Automated complex compliance and audit requirements tailored to local German regulations — including version control, compliance checks with real-time alerts, and detailed audit trails for full transparency",
    "Built real-time collaboration features enabling users and tax professionals to review and approve documents simultaneously, with role-based access control to protect sensitive information",
    "Integrated with accounting software and tax filing systems to streamline the entire tax process from documentation to submission, with reporting and analytics tools for data-driven decisions"
  ],
  "impact": "Businesses can now manage tax workflows with ease, meet German regulatory standards, and expand operations with confidence — turning a complex compliance process into a simple, guided experience.",
  "logos": [
    { "src": "/images/group-203114.svg", "name": "TypeORM" },
    { "src": "/images/group-203069.svg", "name": "Express" },
    { "src": "/images/group-203113.svg", "name": "React" },
    { "src": "/images/group-203065.svg", "name": "Docker" },
    { "src": "/images/group-203067.svg", "name": "Node" }
  ],
  "stack": "TypeOrm, Express, React, Docker, Jest, MySQL, Node"
}
```

#### 3. Sky Tracks

```json
{
  "slug": "sky-tracks",
  "title": "Sky Tracks",
  "subtitle": "Music Tech",
  "client": "Skytracks",
  "timeline": "1 Year",
  "services": ["Backend", "Frontend", "CI/CD", "QA & Testing"],
  "imgSrc": "/images/file-20-2-.jpg",
  "imgSrcSet": "/images/file-20-2-p-500.jpg 500w, /images/file-20-2-p-800.jpg 800w, /images/file-20-2-p-1080.jpg 1080w, /images/file-20-2-p-1600.jpg 1600w",
  "mockupSrc": "/images/mockup.png",
  "mockupSrcSet": "/images/mockup-p-500.png 500w, images/mockup-p-800.png 800w, images/mockup-p-1080.png 1080w, images/mockup-p-1600.png 1600w, images/mockup.png 2000w",
  "liveLink": "https://skytracks.io/",
  "intro": "A cloud-based music production suite with synths, drums, and effects — a digital platform that allows musicians and producers to create, record, and manipulate music entirely in the cloud.",
  "challenge": "Musicians needed a platform to collaborate in real-time on music production — from anywhere in the world — with low latency and pro-grade tools.\n\nThe platform required a full digital audio workstation accessible through a web browser, offering audio recording, MIDI sequencing, audio editing, and mixing capabilities. Real-time collaboration tools were essential — multi-user project editing, chat, and the ability for musicians and producers to work together remotely.\n\nBeyond collaboration, the platform needed a range of virtual instruments including synthesizers, drum machines, and sample libraries, plus a comprehensive library of audio effects, plugins, and processing tools. All of this had to work with low-latency audio streaming, robust security measures for protecting users' music and data, and seamless export options for finished tracks.",
  "solution": [
    "Built a WebRTC-powered collaboration system with real-time audio sync — enabling musicians to work together remotely with multi-user project editing and instant communication",
    "Integrated virtual instruments and multitrack audio editing — including synthesizers, drum machines, sample libraries, and a full DAW accessible directly from the browser",
    "Implemented low-latency audio streaming solutions to ensure real-time interaction with virtual instruments and effects, using specialized audio streaming APIs for professional-grade performance",
    "Designed an intuitive and responsive user interface that allows users to easily access and control virtual instruments and effects, with an efficient workflow optimized for music production",
    "Built robust security measures to protect user data, music files, and sensitive information — using encryption, access controls, and regular security audits",
    "Designed the platform to be scalable with auto-scaling and load balancing to maintain optimal performance across varying levels of user activity, with cloud-based storage for projects and audio files"
  ],
  "impact": "Artists can co-create tracks remotely in real time, eliminating geographic barriers to collaboration and creation — bringing professional music production to the cloud.",
  "logos": [
    { "src": "/images/group-203152.svg", "name": "Tailwind" },
    { "src": "/images/group-203061.svg", "name": "Angular" },
    { "src": "/images/group-203065.svg", "name": "Docker" },
    { "src": "/images/group-203067.svg", "name": "Jest" },
    { "src": "/images/group-203111.svg", "name": "Node" }
  ],
  "stack": "Knex, Tone.js, Tailwind, Kpa, Angular, Docker, Jest, Node"
}
```

#### 4. TV Cine

```json
{
  "slug": "tv-cine",
  "title": "TV Cine",
  "subtitle": "Entertainment",
  "client": "TvCine",
  "timeline": "1 Year",
  "services": ["Backend", "Frontend", "CI/CD", "QA & Testing"],
  "imgSrc": "/images/file-20-3-.jpg",
  "imgSrcSet": "/images/file-20-3-p-800.jpg 800w, /images/file-20-3-p-1080.jpg 1080w, /images/file-20-3-p-1600.jpg 1600w",
  "mockupSrc": "/images/tvcine.png",
  "mockupSrcSet": "/images/tvcine-p-500.png 500w, images/tvcine-p-800.png 800w, images/tvcine.png 2000w",
  "liveLink": "https://www.tvcine.pt/",
  "intro": "Portugal's premium movie channel brand — owned by NOS Comunicações — offering recent blockbusters, classic films, independent cinema, and original content to subscribers.",
  "challenge": "Maintaining and evolving features for both the user-facing frontend and administrative backoffice of a premium cinema platform — ensuring cross-device compatibility, responsive design, performance optimization, and workflow automation.\n\nThe frontend required an intuitive and user-friendly interface that balances aesthetics with functionality while ensuring crucial usability across various web browsers and devices — desktops, smartphones, and tablets. Implementing a responsive design to different screen sizes and orientations was essential for providing a consistent experience.\n\nOn the backoffice side, the challenges included handling and managing large volumes of data effectively, implementing robust user authorization and access control mechanisms, designing workflow automation processes to streamline tasks, and continuously maintaining and updating the system to address bugs, security vulnerabilities, and evolving business needs.",
  "solution": [
    "Designed an intuitive, responsive frontend compatible across devices and browsers — balancing aesthetics with functionality to deliver a seamless cinematic experience for subscribers",
    "Optimized frontend performance to ensure fast loading times and smooth interactions — critical for a streaming platform where every second of delay impacts user satisfaction",
    "Built backoffice tools with workflow automation for streamlined content management — enabling efficient data entry, storage, retrieval, and processing for large volumes of media content",
    "Implemented robust user authorization and access control mechanisms to ensure only authorized personnel can access and modify sensitive data, with role-based permissions for different team members",
    "Established continuous maintenance and update processes to address bugs, security vulnerabilities, and evolving business needs — keeping the platform reliable and up-to-date"
  ],
  "impact": "Exceeded key performance indicators and significantly improved user engagement across the platform's digital presence — delivering a premium streaming experience to thousands of subscribers.",
  "logos": [
    { "src": "/images/group-203118.svg", "name": "Vue.js" },
    { "src": "/images/group-203066.svg", "name": "MongoDB" },
    { "src": "/images/entity-20framework.svg", "name": "Entity Framework" },
    { "src": "/images/group-203157.svg", "name": ".Net Core" },
    { "src": "/images/g862.svg", "name": "Nuxt" }
  ],
  "stack": "Vue.js, MongoDb, Entity Framework, .Net Core, Nuxt"
}
```

#### 5. Royalty Flush

```json
{
  "slug": "royalty-flush",
  "title": "Royalty Flush",
  "subtitle": "Music Tech — CWR",
  "client": "North Music Group",
  "timeline": "1 Year",
  "services": ["Backend", "CI/CD", "QA & Testing"],
  "imgSrc": "/images/royalty_flash.jpg",
  "imgSrcSet": "/images/royalty_flash-p-800.jpg 800w, /images/royalty_flash-p-1080.jpg 1080w, /images/royalty_flash-p-1600.jpg 1600w",
  "mockupSrc": "/images/rf_mockup.png",
  "mockupSrcSet": "/images/rf_mockup-p-500.png 500w, images/rf_mockup.png 2000w",
  "liveLink": "https://www.northmusicgroup.com/",
  "intro": "A comprehensive digital tool tailored to assist music publishers and sound recording owners in efficiently managing their music catalogs, licensing, royalties, and revenue streams.",
  "challenge": "Managing music royalties and contract metadata for artists and labels often involves slow, manual processes that lack transparency.\n\nThe platform needed to maintain an organized database of music compositions and sound recordings — including detailed metadata, ownership information, and ISRC/ISWC codes. It had to track and manage royalty obligations and revenue streams for each musical work, ensuring accurate and transparent royalty calculations.\n\nBeyond tracking, the system needed to facilitate the licensing process for music usage in films, TV shows, commercials, and video games — while enforcing copyright and licensing terms to protect intellectual property. Performance data from streaming and radio airplay needed to be monitored, with detailed reports and analytics on royalties, earnings, and music usage trends.",
  "solution": [
    "Developed a custom backend that ingests streaming data and calculates royalties accurately — providing a centralized platform for catalog organization, royalty tracking, licensing, and reporting",
    "Created smart-contract-style transparency tools for contracts and splits — managing agreements with artists, songwriters, and other parties while ensuring compliance with terms",
    "Optimized performance to handle surges during royalty payout cycles — with payment processing integration that supports calculation and distribution of royalties to all stakeholders",
    "Built comprehensive reporting and analytics capabilities — generating detailed reports on royalties, earnings, and music usage to help users gain insights into revenue sources and track trends",
    "Integrated with performance rights organizations, digital streaming platforms, and industry-specific databases for seamless data exchange — with role-based access control to safeguard sensitive data"
  ],
  "impact": "Labels and artists gain clarity and confidence in their revenue flows, reducing disputes and improving trust across the board — streamlining workflows, maximizing revenue, and empowering data-driven decisions.",
  "logos": [
    { "src": "/images/group-203156.svg", "name": ".Net Core" },
    { "src": "/images/entity-20framework.svg", "name": "Entity Framework" },
    { "src": "/images/group-203120.svg", "name": "Octopus Deploy" },
    { "src": "/images/group-203065.svg", "name": "Docker" },
    { "src": "/images/group-203121.svg", "name": "React" }
  ],
  "stack": ".Net Core, Entity Framework, Octopus Deploy, Docker, React, Hangfire, PostgreSQL, MediatR"
}
```

#### 6. Vector

```json
{
  "slug": "vector",
  "title": "Vector",
  "subtitle": "Fintech",
  "client": "Liminality Labs",
  "timeline": "6 Months",
  "services": ["Backend", "Frontend", "CI/CD", "QA & Testing"],
  "imgSrc": "/images/vector.jpg",
  "imgSrcSet": "/images/vector-p-800.jpg 800w, /images/vector-p-1080.jpg 1080w, /images/vector-p-1600.jpg 1600w",
  "mockupSrc": "/images/vector_m.png",
  "mockupSrcSet": "/images/vector_m-p-500.png 500w, images/vector_m.png 2000w",
  "liveLink": "https://quantapes.com/",
  "intro": "A high-frequency trading platform connecting user accounts on exchanges like Bybit and Coinbase — automating trades based on price signals and pre-defined strategies.",
  "challenge": "Liminality Labs needed a high-frequency trading platform that could connect user accounts on exchanges like Bybit and Coinbase and automate trades based on price signals and pre-defined strategies.\n\nThe application arrived in a completely non-functional state. While the user interface was implemented, it was merely illustrative and lacked any connection to the backend. The backend itself was dysfunctional — creating frustration for the project owner and leaving the platform unable to execute a single trade.\n\nThe core challenge was not just fixing existing code, but rebuilding the entire system from the ground up — creating a reliable architecture capable of handling real-time strategy execution, secure exchange integrations, and automated crypto trades with precision and speed.",
  "solution": [
    "Rebuilt the entire backend from scratch with a new tech stack — creating a reliable architecture capable of handling real-time strategy execution and high-frequency trading operations",
    "Integrated secure exchange connections for Bybit and Coinbase — enabling automated crypto trades with proper authentication, rate limiting, and error handling",
    "Restored full buy/sell automation based on user-defined price signals — ensuring trades execute seamlessly when market conditions match predefined criteria",
    "Implemented a robust strategies system allowing users to subscribe to and run automated trading algorithms designed by experts — with real-time monitoring and performance tracking",
    "Connected the existing UI to the fully operational backend — transforming an illustrative interface into a functional trading dashboard with live data and execution controls",
    "Delivered the reworked application within months — meeting all objectives and delivering core functionalities including strategy management, trade execution, and portfolio monitoring"
  ],
  "impact": "Vector now provides a robust automation platform where users can subscribe to expert-built trading strategies that execute trades seamlessly — turning a broken application into a fully functional high-frequency trading system.",
  "logos": [
    { "src": "/images/mikrorm.svg", "name": "MikroORM" },
    { "src": "/images/g862.svg", "name": "Next.js" },
    { "src": "/images/path-20825.svg", "name": "Kafka" },
    { "src": "/images/group-203124.svg", "name": "PostgreSQL" },
    { "src": "/images/group-203065.svg", "name": "Docker" }
  ],
  "stack": "MikroOrm, Next, Kafka, PostgreSQL, Docker, Nx, Webpack, Nest.js"
}
```

---

## Step 2: GSAP Scroll Animations for ProjectDetailPage

### Animation Strategy (inspired by GSAP Showcase patterns)

The animations should enhance the reading experience, not distract from it. Each section gets subtle, purposeful animations:

#### Hero Section
- **Parallax image**: Image moves slightly slower than scroll (parallax effect)
- **Marquee text**: Already animated with CSS, keep as-is
- **Fade-in on load**: Hero content fades in smoothly

#### Intro Section
- **Title reveal**: Project title slides up from below with stagger
- **Metadata items**: Each metadata item fades in with stagger (0.1s delay between each)
- **Subtitle + description**: Lines reveal one by one (text split animation)
- **Divider line**: Expands from center outward

#### Challenge Section
- **Section label**: Fades in from left
- **Heading**: Slides up with slight overshoot
- **Text paragraphs**: Each paragraph fades in with stagger as you scroll
- **Mockup image**: Parallax effect + subtle scale on scroll

#### Solution Section
- **Solution items**: Each bullet point slides in from left with stagger (0.15s between each)
- **Arrow icons**: Fade in slightly after text
- **Image**: Parallax effect with subtle rotation on scroll

#### Impact Section
- **Label + heading**: Slide up together
- **Impact text**: Gradient text reveals word by word or line by line
- **Background**: Subtle gradient shift animation

#### Tech Stack Section
- **Tags**: Pop in with stagger (scale from 0.8 to 1)
- **Logos**: Fade in with stagger from bottom
- **Live link**: Slides in from left

#### Next Project
- **Label**: Fades in
- **Project name**: Slides up from below
- **Arrow**: Bounces in with slight rotation

### Implementation Approach

Use GSAP ScrollTrigger for scroll-based animations. Since GSAP is already installed and used in the codebase (LoadingScreen, NavMenu), we can leverage it directly.

Create a custom hook `useProjectAnimations` that:
1. Registers GSAP ScrollTrigger plugin
2. Sets up timelines for each section
3. Handles cleanup on unmount
4. Disables animations on mobile for performance

### Animation Classes/Attributes

Add `data-animate` attributes to elements in ProjectDetailPage:

```jsx
// Hero
<div data-animate="hero-reveal">...</div>

// Intro
<h1 data-animate="title-reveal">{project.title}</h1>
<div data-animate="stagger-fade" data-animate-stagger="100">
  {metadata items}
</div>

// Challenge
<span data-animate="slide-from-left">The Challenge</span>
<h2 data-animate="slide-up">{project.challenge}</h2>
<p data-animate="fade-in">{paragraph}</p>

// Solution
<ul data-animate="solution-list">
  {solution items with stagger}
</ul>

// Impact
<p data-animate="impact-reveal">{project.impact}</p>
```

### CSS Animation Presets

Add new animation presets to the existing `attribute-presets.js` file:

```js
export const ATTRIBUTE_PRESETS = {
  // ... existing presets ...
  
  'title-reveal': {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 40px, 0)',
    transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  'slide-from-left': {
    initialOpacity: '0',
    initialTransform: 'translate3d(-30px, 0, 0)',
    transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  'slide-up': {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 30px, 0)',
    transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  'fade-in': {
    initialOpacity: '0',
    transition: 'opacity 0.6s ease',
  },
  'solution-list': {
    initialOpacity: '0',
    initialTransform: 'translate3d(-20px, 0, 0)',
    transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  'impact-reveal': {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 20px, 0)',
    transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  'tag-pop': {
    initialOpacity: '0',
    initialTransform: 'scale(0.8)',
    transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  'logo-fade': {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 15px, 0)',
    transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  },
};
```

---

## Step 3: Implementation Order

1. Rewrite `src/data/projects.json` with rich content (all 6 projects)
2. Add new animation presets to `src/animations/attribute-presets.js`
3. Update `src/pages/ProjectDetailPage.jsx` with `data-animate` attributes
4. Add parallax effect to hero image using GSAP ScrollTrigger
5. Add CSS transitions for new animation presets
6. Test all animations on desktop and mobile
7. Run build to verify
8. DO NOT COMMIT until user tests layout

---

## Key Animation Principles

1. **Subtle over flashy**: Animations should enhance readability, not distract
2. **Consistent timing**: Use the same easing curves throughout (cubic-bezier(0.16, 1, 0.3, 1))
3. **Stagger wisely**: 100-150ms between items feels natural
4. **Mobile-friendly**: Reduce or disable complex animations on mobile
5. **Performance**: Use transform and opacity only (GPU-accelerated)
6. **Accessibility**: Respect `prefers-reduced-motion` media query