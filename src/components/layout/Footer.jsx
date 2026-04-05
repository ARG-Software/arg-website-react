import { SocialIcons } from '../icons/SocialIcons';
import { SectionDivider } from './SectionDivider';

export function Footer({ year = 2026 }) {
  return (
    <footer className="footer">
      <div className="container-medium footer-container padding-global">
        <SectionDivider variant="footer" />
        <div className="footer_copywrite-content">
          <div className="overflow-hidden">
            <div
              data-w-id="65437121-d89f-1a6b-706c-c7382d01d634"
              style={{
                opacity: 0,
                transform:
                  'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
              }}
              className="hide-mobile-landscape"
            >
              © Arg {year}. All Rights Reserved
            </div>
          </div>
          <div className="footer_copywrite-buttons">
            <SocialIcons />
          </div>
          <div className="footer_copywrite-text-mobile">
            <div
              data-w-id="174cb714-f667-c53e-3e09-63bdbb235a43"
              style={{
                opacity: 0,
                transform:
                  'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
              }}
              className="text-block-2"
            >
              Arg is based in Funchal and Porto, Portugal
            </div>
            <div className="show-mobile-landscape">© Arg {year}. All Rights Reserved</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
