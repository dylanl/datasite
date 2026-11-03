export function Navbar() {
  return (
    <header className="site-header">
      <a href="/" className="brand" aria-label="Data Atlas home">
        <span className="brand-mark">DA</span>
        <span>Data Atlas</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="/Graph">Explorer</a>
        <a href="/about">Methodology</a>
      </nav>
    </header>
  );
}
