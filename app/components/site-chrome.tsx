import { Icon } from './icon';

export function SiteHeader() {
  return (
    <header className="header">
      <a href="#top" className="wordmark">
        ROAMWISE<span>®</span>
      </a>
      <nav>
        <a href="#results">RUTT</a>
        <a href="#directory">INDEX</a>
        <button className="circle-button" aria-label="Profil">
          LE
        </button>
      </nav>
    </header>
  );
}

const promises = [
  'Plan med besökstid och gångtid',
  'Slutadress med tidsmarginal',
  'Stopp du kan prioritera',
  'Kontrollera öppettider hos verksamheten',
  'Navigation och lokaltrafik till nästa stopp',
];

export function ExploreSection() {
  return (
    <section className="explore" id="explore">
      <div>
        <p className="overline">ALLT PÅ ETT STÄLLE</p>
        <h2>
          Från första kaffet
          <br />
          till sista låten.
        </h2>
      </div>
      <div className="explore-list">
        {promises.map((text, i) => (
          <p key={text}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            {text}
            <Icon name="check" />
          </p>
        ))}
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <a href="#top" className="wordmark">
        ROAMWISE<span>®</span>
      </a>
      <p>DIN STAD. DIN TID. DIN RUTT.</p>
      <small>© 2026</small>
    </footer>
  );
}

export function MobileTabs({ onMap }: { onMap: () => void }) {
  return (
    <nav className="mobile-tabs" aria-label="Huvudnavigering">
      <a href="#top">
        <span>⌂</span>PLAN
      </a>
      <a href="#results">
        <span>①</span>RUTT
      </a>
      <button onClick={onMap}>
        <span>◇</span>KARTA
      </button>
      <a href="#directory">
        <span>☷</span>LISTA
      </a>
    </nav>
  );
}
