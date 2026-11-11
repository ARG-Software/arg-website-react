import { ProductHuntIcon } from '@ui/icons/ProductHuntIcon.jsx';
import { RocketIcon } from '@ui/icons/RocketIcon.jsx';
import { trackOutbound } from '@services/analytics';

const ICONS = { producthunt: ProductHuntIcon, rocket: RocketIcon };

/**
 * Award pill: the platform's icon, its name over what it gave us, and an arrow out. The whole pill
 * links to our page on the platform.
 */
export function AwardCard({ award, location }) {
  const Icon = ICONS[award.icon] ?? RocketIcon;

  return (
    <a
      href={award.href}
      className="award-card"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackOutbound(award.href, award.name, location)}
    >
      <span className="award-card__icon">
        <Icon />
      </span>
      <span className="award-card__text">
        <span className="award-card__name">{award.name}</span>
        <span className="award-card__label">{award.label}</span>
      </span>
      <span className="award-card__arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}
