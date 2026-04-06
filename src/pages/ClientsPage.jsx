import { Navbar, Footer, arrowSvg, StatsGrid, CaseStudyCard, SEO } from '../components';
import { SubpageHero } from '../components/hero/SubpageHero';
import { useScrollAnimations, useCountUp } from '../hooks';
import { trackCTA } from '../hooks/useAnalytics';
import '../styles/clients.css';

export default function ClientsPage() {
  useScrollAnimations(); // Scroll animations including footer

  useCountUp('.cp-count', { duration: 2000 });

  const STATS = [
    { value: 6, label: 'Impacted countries' },
    { value: 2000, label: 'Transactions per second' },
    { value: 1000, label: 'Deploys into production' },
    { value: 25, label: 'Years experience combined' },
  ];

  const PROJECTS = [
    {
      title: 'Mojaloop',
      subtitle: 'Fintech',
      idx: '01',
      img: '/images/file.jpg',
      mockup: '/images/mojaloop-mobile-.png',
      link: 'https://mojaloop.io/',
      problem:
        "The implementation of Mojaloop's financial hub faced challenges at the intersection of technology, finance, and inclusivity. Ensuring seamless interoperability among diverse financial systems required overcoming technical hurdles like harmonizing protocols, maintaining data integrity, and handling high transaction volumes in unstable network conditions. Additionally, compliance with varied cultural, regulatory, and economic frameworks complicated the mission of fostering financial inclusion while maintaining stakeholder trust and credibility.",
      solutionBold:
        'ARG Software was invited to cooperate in a new version for the open-source solution that made digital payments easy and affordable for people and organizations worldwide.',
      solution:
        "Mojaloop's vNext implementation enhanced scalability, security, and modularity through an updated tech stack and microservices architecture to address these challenges. Real-time transaction settlement was implemented to reduce delays, and advanced security measures safeguarded sensitive data. Regulatory compliance tools were developed, and the user experience was improved with a more intuitive and accessible interface. Interoperability was expanded globally by fostering partnerships, while comprehensive resources enriched developer ecosystems.",
      stack: 'Express, MongoDb, Kafka, Angular, Docker, Jest, Node',
      logos: [
        { src: '/images/group-203069.svg', name: 'Express' },
        { src: '/images/group-203066.svg', name: 'MongoDB' },
        { src: '/images/path-20825.svg', name: 'Kafka' },
        { src: '/images/group-203061.svg', name: 'Angular' },
        { src: '/images/group-203065.svg', name: 'Docker' },
      ],
      testimonial: {
        quote:
          'It was a pleasure to work with! Good communication solid work and helped us deliver our new version of the product in a timely fashionable way.',
        author: 'Marc-André Mignault',
        role: 'Project Manager at Skytracks',
      },
    },
    {
      title: 'Dokutar',
      subtitle: 'Digital Marketing',
      idx: '02',
      img: '/images/file-20-1-.jpg',
      mockup: '/images/dokutar.png',
      link: 'https://www.dokutar.de',
      problem:
        'Dokutar aimed to help businesses of all sizes streamline their tax processes while maintaining full GDPR compliance. Their mission was to offer a secure, user-friendly platform that could save time and reduce costs. However, their current solution was restricted by scalability limitations. They needed to migrate from WordPress to a more robust, dedicated backend.',
      solutionBold:
        'ARG Software worked with MbNetzwerk to develop a more intuitive interface and efficient backend, making tax management as simple as point and click.',
      solution:
        'The tax documentation software successfully addressed all key challenges, delivering a secure, efficient, and user-friendly cloud-based solution for managing tax processes. It enabled seamless document storage and organization, with automated data capture reducing manual entry errors. Workflow automation guided users through the tax documentation process, ensuring compliance and accuracy at every step.',
      stack: 'TypeOrm, Express, React, Docker, Jest, MySQL, Node',
      logos: [
        { src: '/images/group-203114.svg', name: 'TypeORM' },
        { src: '/images/group-203069.svg', name: 'Express' },
        { src: '/images/group-203113.svg', name: 'React' },
        { src: '/images/group-203065.svg', name: 'Docker' },
        { src: '/images/group-203067.svg', name: 'Node' },
      ],
      testimonial: {
        quote:
          'Jose and Rui delivered good work and I enjoyed working with them. They transformed a legacy api from PHP to Typescript, where their architectural skills were really handy.',
        author: 'Hendrik',
        role: 'CTO at Dokutar',
      },
    },
    {
      title: 'Sky Tracks',
      subtitle: 'Music Tech',
      idx: '03',
      img: '/images/file-20-2-.jpg',
      mockup: '/images/mockup.png',
      link: 'https://skytracks.io/',
      problem:
        'Skytracks aimed to develop a cloud-based music production studio that allows musicians, producers, and audio engineers to collaborate online. This required implementing real-time collaboration tools, virtual instruments, cloud storage, an integrated digital audio workstation, audio effects, and sample libraries — all while maintaining low latency and a user-friendly interface.',
      solutionBold:
        'ARG Software partnered with SkyTracks to help developing a new leading, cloud-based music production suite.',
      solution:
        'Skytracks successfully launched a cloud-based music studio by leveraging scalable cloud services to host its components. Real-time collaboration was enabled through low-latency streaming technologies like WebRTC. A rich library of virtual instruments, effects, and sample libraries was integrated into an intuitive DAW accessible via web browsers.',
      stack: 'Knex, Tone.js, Tailwind, Kpa, Angular, Docker, Jest, Node',
      logos: [
        { src: '/images/group-203152.svg', name: 'Tailwind' },
        { src: '/images/group-203061.svg', name: 'Angular' },
        { src: '/images/group-203065.svg', name: 'Docker' },
        { src: '/images/group-203067.svg', name: 'Jest' },
        { src: '/images/group-203111.svg', name: 'Node' },
      ],
      testimonial: {
        quote:
          'It was a pleasure to work with! Good communication solid work and helped us deliver our new version of the product in a timely fashionable way.',
        author: 'Marc-André Mignault',
        role: 'Project Manager at Skytracks',
      },
    },
    {
      title: 'TV Cine',
      subtitle: 'Fintech',
      idx: '04',
      img: '/images/file-20-3-.jpg',
      mockup: '/images/tvcine.png',
      link: 'https://www.tvcine.pt/',
      problem:
        'TvCine encountered significant challenges in implementing and maintaining features for its frontend and backoffice systems. The frontend required a user-friendly, intuitive interface while ensuring cross-browser and cross-device compatibility. Responsiveness and performance optimization were critical for delivering a seamless user experience.',
      solutionBold:
        'By combining digital expertise with innovative technology, the new platform exceeded key performance indicators and highly improved user engagement.',
      solution:
        "TvCine successfully addressed all challenges. The frontend was designed to be intuitive, responsive, and compatible across devices and browsers. Comprehensive user training facilitated the smooth adoption of new features, while ongoing maintenance ensured the system's reliability and adaptability.",
      stack: 'Vue.js, MongoDb, Entity Framework, .Net Core, Nuxt',
      logos: [
        { src: '/images/group-203118.svg', name: 'Vue.js' },
        { src: '/images/group-203066.svg', name: 'MongoDB' },
        { src: '/images/entity-20framework.svg', name: 'Entity Framework' },
        { src: '/images/group-203157.svg', name: '.Net Core' },
        { src: '/images/g862.svg', name: 'Nuxt' },
      ],
      testimonial: null,
    },
    {
      title: 'Royalty Flush',
      subtitle: 'Music Tech — CWR',
      idx: '05',
      img: '/images/royalty_flash.jpg',
      mockup: '/images/rf_mockup.png',
      link: 'https://www.northmusicgroup.com/',
      problem:
        'Developing a music rights management platform presented several challenges due to the complexity of managing music catalogs, tracking royalties, and enforcing rights. Key requirements included organizing extensive metadata, calculating royalties from diverse revenue streams, and facilitating licensing processes for media usage.',
      solutionBold:
        'ARG Software teamed up with North Music Group to create an innovative platform that simplified music rights management.',
      solution:
        'The platform provided catalog management with detailed metadata and automated royalty tracking to ensure accurate and transparent calculations. Licensing and rights enforcement tools streamlined the process of granting permissions and protecting intellectual property.',
      stack:
        '.Net Core, Entity Framework, Octopus Deploy, Docker, React, Hangfire, PostgreSQL, MediatR',
      logos: [
        { src: '/images/group-203156.svg', name: '.Net Core' },
        { src: '/images/entity-20framework.svg', name: 'Entity Framework' },
        { src: '/images/group-203120.svg', name: 'Octopus Deploy' },
        { src: '/images/group-203065.svg', name: 'Docker' },
        { src: '/images/group-203121.svg', name: 'React' },
      ],
      testimonial: null,
    },
    {
      title: 'Vector',
      subtitle: 'Fintech',
      idx: '06',
      img: '/images/vector.jpg',
      mockup: '/images/vector_m.png',
      link: 'https://quantapes.com/',
      problem:
        'The application arrived in a completely non-functional state. The UI was merely illustrative and lacked connection to the backend. It needed to allow a crypto community to integrate their exchanges and automate trades based on pre-defined signals.',
      solutionBold:
        'ARG Software created a digital solution where, besides connecting every dot, commands worked at first and made sense.',
      solution:
        'The backend was completely rebuilt from the ground up, leveraging a new technology stack to ensure functionality, efficiency, and reliability. Within just a few months, the reworked application met its objectives, connecting the UI to a fully operational backend.',
      stack: 'MikroOrm, Next, Kafka, PostgreSQL, Docker, Nx, Webpack, Nest.js',
      logos: [
        { src: '/images/mikrorm.svg', name: 'MikroORM' },
        { src: '/images/g862.svg', name: 'Next.js' },
        { src: '/images/path-20825.svg', name: 'Kafka' },
        { src: '/images/group-203124.svg', name: 'PostgreSQL' },
        { src: '/images/group-203065.svg', name: 'Docker' },
      ],
      testimonial: {
        quote:
          'ARG did great! Was awesome to work with and always quick to respond. Great attitude despite project requirements changing — highly recommend working with ARG!',
        author: 'Austin Klise',
        role: 'CEO at Klise Consulting',
      },
    },
  ];

  return (
    <>
      <SEO
        title="Case Studies & Clients"
        description="Explore how Arg Software delivers impactful solutions across fintech, open payments, and digital platforms. Real projects, real results."
        path="/clients"
      />
      <div className="cp-page">
        <Navbar position="fixed" variant="dark" />

        {/* HERO */}
        <SubpageHero
          title={['They trusted us.', "It's your time now."]}
          subtitle="Real challenges. Real solutions. Explore how we've helped businesses across fintech, music tech, and digital marketing build products that last."
          size="large"
        />

        {/* STATS GRID (separated from hero as requested) */}
        <div
          className="cp-container"
          style={{ marginTop: '-3rem', position: 'relative', zIndex: 2 }}
        >
          <StatsGrid stats={STATS} />
        </div>

        {/* CASE STUDIES */}
        {PROJECTS.map((project, i) => (
          <CaseStudyCard key={i} project={project} index={i} />
        ))}

        {/* CTA */}
        <section className="cp-cta">
          <div className="cp-container cp-cta-inner">
            <h2 className="cp-reveal">
              Ready to elevate
              <br />
              <span>your digital experience?</span>
            </h2>
            <p className="cp-cta-sub cp-reveal cp-delay-1">
              Let's discuss your project and build something remarkable together.
            </p>
            <a
              href="https://zcal.co/argsoftware/project"
              target="_blank"
              rel="noopener noreferrer"
              className="cp-btn cp-reveal cp-delay-2"
              onClick={() => trackCTA('book_meeting', 'clients_cta')}
            >
              Book a Meeting {arrowSvg}
            </a>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
