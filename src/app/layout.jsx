import "./globals.css";
import { Navbar, Footer } from "@/components";

export const metadata = {
  title: "Data Atlas",
  description: "Explore public data across the issues shaping everyday life.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
