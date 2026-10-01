import { ImageResponse } from "next/og";
import { BIO } from "../lib/bio";

// plain text on white, same as the site: name, the visible bio, the domain
export const alt = "Keerthik Muruganandam: software for biological data and real-world workflows";
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
          keerthik muruganandam
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.4, maxWidth: 1000 }}>{BIO}</div>
        <div style={{ fontSize: 30, color: "#0000ee", marginTop: 56 }}>keerthik.dev</div>
      </div>
    ),
    size
  );
}
