import { BOT_URL, LOGIN_URL, NAV } from "./data";
import { ThemeToggle } from "./ThemeToggle";
import { Cta, Eyebrow, Img, Logo } from "./ui";

/* Hero (Figma 246:1344) — photo card with on-media nav, headline, primary CTA and the founder offer. */
export function Hero() {
  return (
    <header className="lp-hero">
      <div className="lp-hero__card">
        <div className="lp-hero__bg" aria-hidden>
          <Img src="/landing/hero.webp" alt="" width={1536} height={864} fetchPriority="high" />
        </div>

        <nav className="lp-nav" aria-label="Asosiy">
          <a href="/biznes" aria-label="Datelle Studio — bosh sahifa"><Logo /></a>
          <div className="lp-nav__links">
            {NAV.map((l) => (
              <a key={l.href} className="lp-navlink" href={l.href}>{l.label}</a>
            ))}
          </div>
          <div className="lp-nav__actions">
            <ThemeToggle />
            <a className="lp-btn lp-btn--ghost" href={LOGIN_URL}>Kirish</a>
            <Cta href={BOT_URL} tone="glass" size="m">Boshlash</Cta>
          </div>
        </nav>

        <div className="lp-hero__content">
          <div className="lp-hero__text">
            <Eyebrow media>Dekor studiyalari va floristlar uchun</Eyebrow>
            <div className="lp-hero__copy">
              <h1 className="lp-h1">Sanalar, buyurtmalar<br />va pul — bir joyda.</h1>
              <p className="lp-lead">Kalendar, avans va qoldiq, jamoa. Telefonda — Telegram ichida, kompyuterda — brauzerda.</p>
            </div>
            <Cta href={BOT_URL} tone="light">Telegram&apos;da boshlash</Cta>
          </div>
          <a className="lp-offer" href="#narxlar">
            <b>3 oy bepul</b>
            <span>Birinchi 10 ta studiya uchun</span>
          </a>
        </div>
      </div>
    </header>
  );
}
