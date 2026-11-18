import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { latestEpisode, latestEpisodeReleased } from "@/lib/data";

export const runtime = "nodejs";
export const alt =
  "CRIMEX HOUSE — Five million. Zero alibis. An interactive heist series.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [artwork, font] = await Promise.all([
    readFile(path.join(process.cwd(), "public/art/motel-room.webp")),
    readFile(
      path.join(
        process.cwd(),
        "node_modules/@fontsource/inter/files/inter-latin-900-normal.woff",
      ),
    ),
  ]);
  const image = await sharp(artwork)
    .resize(1200, 630, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#08080a",
          color: "#f5f2eb",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* Static artwork from the existing brand; no member or unreleased data. */}
        <img
          alt=""
          src={`data:image/jpeg;base64,${image.toString("base64")}`}
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(8,8,10,0.98) 0%, rgba(8,8,10,0.90) 43%, rgba(8,8,10,0.18) 100%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "48px 60px",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width="62" height="62" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="12" fill="#ff2e93" />
              <path
                d="M12 30 32 13l20 17v23H12Z M26 53V34h12v19"
                fill="none"
                stroke="#08080a"
                strokeWidth="5"
              />
            </svg>
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: 900,
                letterSpacing: -2,
              }}
            >
              CRIMEX HOUSE
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div
              style={{
                display: "flex",
                color: "#c0bec8",
                fontSize: 18,
                letterSpacing: 5,
                marginBottom: 18,
              }}
            >
              AN INTERACTIVE HEIST SERIES
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 92,
                fontWeight: 900,
                letterSpacing: -6,
                lineHeight: 1.02,
              }}
            >
              FIVE MILLION.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 92,
                fontWeight: 900,
                letterSpacing: -6,
                lineHeight: 1.02,
                color: "#ff2e93",
              }}
            >
              ZERO ALIBIS.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "12px 18px",
                background: "#ff2e93",
                color: "#08080a",
              }}
            >
              {latestEpisodeReleased
                ? `PART ${String(latestEpisode.part).padStart(2, "0")} LIVE ON INSTAGRAM`
                : "THE NEXT CASE IS IN PRODUCTION"}
            </div>
            <div style={{ display: "flex", color: "#efebf3" }}>
              crimexhouse.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: font, weight: 900, style: "normal" }],
    },
  );
}
