import { SocialIcons } from '../icons/SocialIcons';
import { SectionDivider } from './SectionDivider';

export function Footer({ year = 2026 }) {
  return (
    <footer className="footer" data-animate-scope data-animate-default-stagger="50">
      <div className="container-medium footer-container padding-global">
        <SectionDivider variant="light" />
        <div className="footer_copywrite-content">
          <div className="overflow-hidden">
            <div data-animate="slide-up" className="hide-mobile-landscape" data-animate-order="0">
              © Arg {year}. All Rights Reserved
            </div>
          </div>
          <div className="footer_copywrite-buttons">
            <SocialIcons />
          </div>
          <div className="footer_copywrite-text-mobile">
            <div data-animate="slide-up" className="text-block-2" data-animate-order="1">
              Arg is based in Funchal and Porto, Portugal
            </div>
            <div className="show-mobile-landscape">© Arg {year}. All Rights Reserved</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
