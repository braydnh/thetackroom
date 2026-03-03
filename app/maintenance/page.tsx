export default function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9f6f0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          fontWeight: 700,
          color: "#1a2744",
          letterSpacing: "0.5px",
          marginBottom: "40px",
        }}
      >
        The Tack Room
      </p>

      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "32px",
          fontWeight: 700,
          color: "#1a2744",
          marginBottom: "16px",
        }}
      >
        Coming Soon
      </h1>

      <p
        style={{
          fontSize: "16px",
          color: "#666",
          maxWidth: "380px",
          lineHeight: 1.6,
          marginBottom: "8px",
        }}
      >
        Australia&apos;s equestrian marketplace is getting ready. Check back soon.
      </p>
    </div>
  );
}
