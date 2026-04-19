import type { NextPage } from "next";

const Custom500: NextPage = () => {
  return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>500 — Server Error</h1>
      <p>Maaf, terjadi kesalahan pada server. Silakan coba lagi nanti.</p>
    </div>
  );
};

export default Custom500;
