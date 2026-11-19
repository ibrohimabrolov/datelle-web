import type { Copy } from "./copy";
import { BOT_URL, LOGIN_URL } from "./data";
import { MenuButton } from "./StickyHeader";
import { ThemeToggle } from "./ThemeToggle";
import { Cta, Eyebrow, Img, LangSwitch, Logo } from "./ui";

/* Hero (Figma 246:1344 desktop · 303:3984 mobile/tablet) — photo card with on-media nav, headline, primary CTA and the free-month offer. */
export function Hero({ t }: { t: Copy }) {
  const h = t.hero;
  return (
    <header className="lp-hero">
      <div className="lp-hero__card">
        <div className="lp-hero__bg" aria-hidden>
          <Img src="/landing/hero.webp" alt="" width={1536} height={864} fetchPriority="high" />
        </div>

        <nav className="lp-nav" aria-label={t.a11y.navMain}>
          <a href={t.home}><Logo /><span className="lp-sr">{t.a11y.toHome}</span></a>
          <div className="lp-nav__links">
            {t.nav.map((l) => (
              <a key={l.href} className="lp-navlink" href={l.href}>{l.label}</a>
            ))}
          </div>
          <div className="lp-nav__actions">
            <LangSwitch t={t} className="lp-d-only" />
            <ThemeToggle className="lp-d-only" label={t.a11y.theme} />
            <Cta href={LOGIN_URL} external={false} tone="glass" size="m" className="lp-nav__cta">{t.cta.login}</Cta>
            <MenuButton label={t.a11y.menuOpen} />
          </div>
        </nav>

        <div className="lp-hero__content">
          <div className="lp-hero__text">
            <Eyebrow media>
              <span className="lp-hide-m">{h.eyebrow}</span>
              <span className="lp-m-only">{h.eyebrowShort}</span>
            </Eyebrow>
            <div className="lp-hero__copy">
              <h1 className="lp-h1">{h.h1[0]}<br className="lp-hide-m" /> {h.h1[1]}</h1>
              <p className="lp-lead">{h.lead} <span>{h.leadMore}</span></p>
            </div>
            <Cta href={BOT_URL} tone="light">{t.cta.telegram}</Cta>
          </div>
          <a className="lp-offer" href="#narxlar">
            <b>{h.offer}</b>
            <span>{h.offerNote}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
