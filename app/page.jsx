// Raíz: en producción aquí va tu landing. Por ahora apunta al demo.
export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center",
      fontFamily: "system-ui", background: "#4a0f1c", color: "#E6D2A0", textAlign: "center", padding: 24 }}>
      <div>
        <h1>SELLO</h1>
        <p>Abre un InfoLink de ejemplo:</p>
        <a href="/i/cafedelvalle/menu" style={{ color: "#fff" }}>
          /i/cafedelvalle/menu →
        </a>
      </div>
    </main>
  );
}
