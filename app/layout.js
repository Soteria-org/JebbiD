export const metadata = {
  title: "Jebbidox Youth Investment Club",
  description: "JBDocs investment management platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
