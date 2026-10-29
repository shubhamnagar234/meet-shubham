import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meet Shubham — AI Voice Assistant",
  description:
    "An AI-powered voice assistant that answers questions about Shubham Nagar's engineering background, projects, and experience. Built for the 100x AI Agent Team hiring assessment.",
  keywords: [
    "Shubham Nagar",
    "AI engineer",
    "full stack",
    "React",
    "Next.js",
    "LangChain",
    "RAG",
    "100x Engineering",
  ],
  openGraph: {
    title: "Meet Shubham — AI Voice Assistant",
    description:
      "Explore Shubham Nagar's engineering background through an interactive AI voice assistant.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
