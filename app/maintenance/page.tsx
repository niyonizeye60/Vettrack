// app/maintenance/page.tsx
import TranslatedText from "@/components/translated-text"

export default function Maintenance() {
  return (
    <div style={{ textAlign: "center", paddingTop: "20vh", fontFamily: "Arial" }}>
      <h1 style={{ fontSize: "2rem" }}>🚧 <TranslatedText k="maintenance.unavailable" /> 🚧</h1>
      <p><TranslatedText k="maintenance.checkBack" /></p>
      <p style={{ marginTop: "2rem", fontSize: "1.1rem" }}>
        <TranslatedText k="maintenance.contactUs" />
      </p>
    </div>
  );
}
