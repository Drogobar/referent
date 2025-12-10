export default function Home() {
  return (
    <main
      style={{
        maxWidth: 640,
        width: "100%",
        padding: "2rem",
        borderRadius: 16,
        background: "linear-gradient(145deg, #121b2c, #0e1625)",
        boxShadow: "0 18px 48px rgba(0,0,0,0.35)"
      }}
    >
      <p style={{ opacity: 0.8, marginBottom: "0.75rem" }}>Next.js 14 · App Router</p>
      <h1 style={{ fontSize: "2.4rem", marginBottom: "0.5rem" }}>Привет, мир!</h1>
      <p style={{ lineHeight: 1.6 }}>
        Это тестовая программа Максима Жукова. Я изучаю Next.js
      </p>
    </main>
  );
}

