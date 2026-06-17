import "./globals.css";

export const metadata = {
  title: "SELLO · Fidelización en tu wallet",
  description: "Menú, sellos y premios en un solo link.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
