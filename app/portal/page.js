import JBDocsApp from "@/app-shell/JBDocsApp";

export default function Page({ searchParams }) {
  return (
    <JBDocsApp
      resetPasswordRequested={searchParams?.resetPassword === "1"}
      registerRequested={searchParams?.join === "1"}
    />
  );
}
