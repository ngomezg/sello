import "./globals.css";

export const metadata = {
  title: "SELLO · Fidelización en tu wallet",
  description: "Menú, sellos y premios en un solo link.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SELLO",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* PWA: necesario para instalar en pantalla de inicio (iOS y Android) */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Safari: permite instalar como app nativa */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SELLO" />
        <link rel="apple-touch-icon" href="/logo-wallet.png" />

        {/* Color de la barra de navegación en Android Chrome */}
        <meta name="theme-color" content="#7A1B2E" />
      </head>
      <body>{children}</body>
    </html>
  );
}
