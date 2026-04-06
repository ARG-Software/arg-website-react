import { ProjectItem } from '../../../components/cards/ProjectItem';
import { useProjectModalAnimations } from '../../../hooks';

const PROJECTS = [
  {
    title: 'Mojaloop',
    subtitle: 'Fintech',
    imgSrc: '/images/file.jpg',
    imgSrcSet:
      '/images/file-p-500.jpg 500w, images/file-p-800.jpg 800w, images/file-p-1080.jpg 1080w, images/file-p-1600.jpg 1600w, images/file-p-2000.jpg 2000w, images/file-p-2600.jpg 2600w, images/file-p-3200.jpg 3200w, images/file.jpg 6000w',
    mockupSrc: '/images/mojaloop-mobile-.png',
    mockupSrcSet:
      '/images/mojaloop-mobile-p-500.png 500w, images/mojaloop-mobile-p-800.png 800w, images/mojaloop-mobile-p-1080.png 1080w, images/mojaloop-mobile-p-1600.png 1600w, images/mojaloop-mobile-.png 2000w',
    liveLink: 'https://mojaloop.io/',
    problem:
      "The implementation of Mojaloop's financial hub faced challenges at the intersection of technology, finance, and inclusivity. Ensuring seamless interoperability among diverse financial systems required overcoming technical hurdles like harmonizing protocols, maintaining data integrity, and handling high transaction volumes in unstable network conditions. Additionally, compliance with varied cultural, regulatory, and economic frameworks complicated the mission of fostering financial inclusion while maintaining stakeholder trust and credibility.",
    solutionBold:
      'ARG Software was invited to cooperate in a new version for the open-source solution that made digital payments easy and affordable for people and organizations worldwide.',
    solution:
      "Mojaloop's vNext implementation enhanced scalability, security, and modularity through an updated tech stack and microservices architecture to address these challenges. Real-time transaction settlement was implemented to reduce delays, and advanced security measures safeguarded sensitive data. Regulatory compliance tools were developed, and the user experience was improved with a more intuitive and accessible interface. Interoperability was expanded globally by fostering partnerships, while comprehensive resources enriched developer ecosystems. Educational efforts and a well-planned migration ensured a seamless transition, positioning Mojaloop as a powerful tool for inclusive financial transformation.",
    logos: [
      { src: '/images/group-203069.svg', name: 'Express' },
      { src: '/images/group-203066.svg', name: 'MongoDB' },
      { src: '/images/path-20825.svg', name: 'Kafka' },
      { src: '/images/group-203061.svg', name: 'Angular' },
      { src: '/images/group-203065.svg', name: 'Docker' },
    ],
    stack: 'Express, MongoDb, Kafka, Angular, Docker, Jest, Node',
  },
  {
    title: 'Dokutar',
    subtitle: 'Digital Marketing',
    imgSrc: '/images/file-20-1-.jpg',
    imgSrcSet:
      '/images/file-20-1-p-500.jpg 500w, images/file-20-1-p-800.jpg 800w, images/file-20-1-p-1080.jpg 1080w, images/file-20-1-p-1600.jpg 1600w, images/file-20-1-p-2000.jpg 2000w, images/file-20-1-p-2600.jpg 2600w, images/file-20-1-p-3200.jpg 3200w, images/file-20-1-.jpg 6000w',
    mockupSrc: '/images/dokutar.png',
    mockupSrcSet:
      '/images/dokutar-p-500.png 500w, images/dokutar-p-800.png 800w, images/dokutar-p-1080.png 1080w, images/dokutar-p-1600.png 1600w, images/dokutar.png 2000w',
    liveLink: 'https://www.dokutar.de',
    problem:
      'Dokutar aimed to help businesses of all sizes streamline their tax processes while maintaining full GDPR compliance. Their mission was to offer a secure, user-friendly platform that could save time and reduce costs, positioning them to capture new market opportunities ahead of their competitors. However, their current solution was restricted by scalability limitations. To overcome this, they needed to migrate Dokutar from WordPress to a more robust, dedicated backend that would provide the scalability and speed required.',
    solutionBold:
      'ARG Software worked with MbNetzwerk to develop a more intuitive interface and efficient backend, making tax management as simple as point and click.',
    solution:
      'The tax documentation software successfully addressed all key challenges, delivering a secure, efficient, and user-friendly cloud-based solution for managing tax processes. It enabled seamless document storage and organization, with automated data capture reducing manual entry errors. Workflow automation guided users through the tax documentation process, ensuring compliance and accuracy at every step.',
    logos: [
      { src: '/images/group-203114.svg', name: 'TypeORM' },
      { src: '/images/group-203069.svg', name: 'Express' },
      { src: '/images/group-203113.svg', name: 'React' },
      { src: '/images/group-203065.svg', name: 'Docker' },
      { src: '/images/group-203067.svg', name: 'Node' },
    ],
    stack: 'TypeOrm, Express, React, Docker, Jest, MySQL, Node',
  },
  {
    title: 'Sky Tracks',
    subtitle: 'Music Tech',
    imgSrc: '/images/file-20-2-.jpg',
    imgSrcSet:
      '/images/file-20-2-p-500.jpg 500w, images/file-20-2-p-800.jpg 800w, images/file-20-2-p-1080.jpg 1080w, images/file-20-2-p-1600.jpg 1600w, images/file-20-2-p-2000.jpg 2000w, images/file-20-2-p-2600.jpg 2600w, images/file-20-2-p-3200.jpg 3200w, images/file-20-2-.jpg 6400w',
    mockupSrc: '/images/mockup.png',
    mockupSrcSet:
      '/images/mockup-p-500.png 500w, images/mockup-p-800.png 800w, images/mockup-p-1080.png 1080w, images/mockup-p-1600.png 1600w, images/mockup.png 2000w',
    liveLink: 'https://skytracks.io/',
    problem:
      'Skytracks aimed to develop a cloud-based music production studio that allows musicians, producers, and audio engineers to collaborate online. This required implementing real-time collaboration tools, virtual instruments, cloud storage, an integrated digital audio workstation (DAW), audio effects, and sample libraries. Additionally, ensuring robust security, seamless export options, and compatibility with various devices posed challenges, all while maintaining low latency and a user-friendly interface.',
    solutionBold:
      'ARG Software partnered with SkyTracks to help developing a new leading, cloud-based music production suite.',
    solution:
      'Skytracks successfully launched a cloud-based music studio by leveraging scalable cloud services to host its components. Real-time collaboration was enabled through low-latency streaming technologies like WebRTC. A rich library of virtual instruments, effects, and sample libraries was integrated into an intuitive DAW accessible via web browsers.',
    logos: [
      { src: '/images/group-203152.svg', name: 'Tailwind' },
      { src: '/images/group-203061.svg', name: 'Angular' },
      { src: '/images/group-203065.svg', name: 'Docker' },
      { src: '/images/group-203067.svg', name: 'Jest' },
      { src: '/images/group-203111.svg', name: 'Node' },
    ],
    stack: 'Knex, Tone.js, Tailwind, Kpa, Angular, Docker, Jest, Node',
  },
  {
    title: 'TV Cine',
    subtitle: 'Fintech',
    imgSrc: '/images/file-20-3-.jpg',
    imgSrcSet:
      '/images/file-20-3-p-800.jpg 800w, images/file-20-3-p-1080.jpg 1080w, images/file-20-3-.jpg 6400w',
    mockupSrc: '/images/tvcine.png',
    mockupSrcSet:
      '/images/tvcine-p-500.png 500w, images/tvcine-p-800.png 800w, images/tvcine.png 2000w',
    liveLink: 'https://www.tvcine.pt/',
    problem:
      'TvCine encountered significant challenges in implementing and maintaining features for its frontend and backoffice systems. The frontend required a user-friendly, intuitive interface while ensuring cross-browser and cross-device compatibility. Responsiveness to different screen sizes and performance optimization were critical for delivering a seamless user experience.',
    solutionBold:
      'By combining digital expertise with innovative technology, the new platform exceeded key performance indicators and highly improved user engagement.',
    solution:
      'TvCine successfully addressed all challenges and achieved its objectives. The frontend was designed to be intuitive, responsive, and compatible across devices and browsers, providing a consistent and efficient user experience. Performance optimization ensured smooth functionality and quick load times.',
    logos: [
      { src: '/images/group-203118.svg', name: 'Vue.js' },
      { src: '/images/group-203066.svg', name: 'MongoDB' },
      { src: '/images/entity-20framework.svg', name: 'Entity Framework' },
      { src: '/images/group-203157.svg', name: '.Net Core' },
      { src: '/images/g862.svg', name: 'Nuxt' },
    ],
    stack: 'Vue.js, MongoDb, Entity Framework, .Net Core, Nuxt',
  },
  {
    title: 'Royalty Flush',
    subtitle: 'MUSIC TECH - CWR',
    imgSrc: '/images/royalty_flash.jpg',
    imgSrcSet:
      '/images/royalty_flash-p-800.jpg 800w, images/royalty_flash-p-1080.jpg 1080w, images/royalty_flash.jpg 4821w',
    mockupSrc: '/images/rf_mockup.png',
    mockupSrcSet: '/images/rf_mockup-p-500.png 500w, images/rf_mockup.png 2000w',
    liveLink: 'https://www.northmusicgroup.com/',
    problem:
      'Developing a music rights management platform presented several challenges due to the complexity of managing music catalogs, tracking royalties, and enforcing rights. Key requirements included organizing extensive metadata for compositions and recordings, calculating and tracking royalties from diverse revenue streams, and facilitating licensing processes for media usage.',
    solutionBold:
      'ARG Software teamed up with North Music Group to create an innovative platform that simplified music rights management.',
    solution:
      'The music rights management platform successfully met all objectives by delivering a robust and comprehensive solution. It provided catalog management with detailed metadata and automated royalty tracking to ensure accurate and transparent calculations.',
    logos: [
      { src: '/images/group-203156.svg', name: '.Net Core' },
      { src: '/images/entity-20framework.svg', name: 'Entity Framework' },
      { src: '/images/group-203120.svg', name: 'Octopus Deploy' },
      { src: '/images/group-203065.svg', name: 'Docker' },
      { src: '/images/group-203121.svg', name: 'React' },
    ],
    stack:
      '.Net Core, Entity Framework, Octopus Deploy, Docker, React, Hangfire, PostgreSQL, MediatR',
  },
  {
    title: 'Vector',
    subtitle: 'Fintech',
    imgSrc: '/images/vector.jpg',
    imgSrcSet:
      '/images/vector-p-800.jpg 800w, images/vector-p-1080.jpg 1080w, images/vector.jpg 3200w',
    mockupSrc: '/images/vector_m.png',
    mockupSrcSet: '/images/vector_m-p-500.png 500w, images/vector_m.png 2000w',
    liveLink: 'https://quantapes.com/',
    problem:
      'The application initially presented significant challenges, arriving in a completely non-functional state. While the user interface was implemented, it was merely illustrative and lacked connection to the backend. The backend itself was dysfunctional, creating frustration for the project owner.',
    solutionBold:
      'ARG Software created a digital solution where, besides connecting every dot, commands worked at first and made sense.',
    solution:
      'To address the challenges, the backend was completely rebuilt from the ground up, leveraging a new technology stack to ensure functionality, efficiency, and reliability. Within just a few months, the reworked application met its objectives, connecting the UI to a fully operational backend and delivering the core functionalities seamlessly.',
    logos: [
      { src: '/images/mikrorm.svg', name: 'MikroORM' },
      { src: '/images/g862.svg', name: 'Next.js' },
      { src: '/images/path-20825.svg', name: 'Kafka' },
      { src: '/images/group-203124.svg', name: 'PostgreSQL' },
      { src: '/images/group-203065.svg', name: 'Docker' },
    ],
    stack: 'MikroOrm, Next, Kafka, PostgreSQL, Docker, Nx, Webpack, Nest.js',
  },
];

export function ProjectsSection({ className = '' }) {
  useProjectModalAnimations();
  return (
    <section
      id="cases"
      data-w-id="8e4ba5b9-2e4a-5f51-aae7-91657d6edc11"
      className={`projects_wrap background-color-white padding-section-xlarge ${className}`.trim()}
    >
      <div className="projects_contain container padding-global">
        <div className="projects_heading-wrapper">
          <h2 className="projects_heading heading-style-h2">
            They trusted us. It's your time now.
          </h2>
          <div className="subtitle_tag-wrapper">
            <div>Our Work</div>
          </div>
        </div>
        <div className="projects_list_wrap w-dyn-list">
          <div role="list" className="projects_list w-dyn-items">
            {PROJECTS.map((project, i) => (
              <ProjectItem key={i} {...project} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
