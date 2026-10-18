import { ImageResponse } from "next/og";
import { BIO, DOMAIN, NAME } from "../content/site";

// plain text on white, same as the site: name, the visible bio, the domain.
// Colors are literal because the image renderer can't read CSS variables.
export const alt = `${NAME}: ${BIO}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "#ffffff",
          color: "#000000",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, marginBottom: 36 }}>
          {NAME}
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.4, maxWidth: 1000 }}>{BIO}</div>
        <div style={{ fontSize: 30, color: "#0000ee", marginTop: 56 }}>{DOMAIN}</div>
      </div>
    ),
    size
  );
}
