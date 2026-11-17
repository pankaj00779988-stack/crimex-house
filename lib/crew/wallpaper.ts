import sharp from "sharp";
const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export async function renderCrewWallpaper(
  memberHandle: string,
  serial: string,
) {
  const handle = xml(memberHandle);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs><pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#ffffff" stroke-opacity=".045"/></pattern>
      <radialGradient id="glow"><stop stop-color="#FF2E93" stop-opacity=".22"/><stop offset="1" stop-color="#08080A" stop-opacity="0"/></radialGradient></defs>
      <rect width="1080" height="1920" fill="#08080A"/><rect width="1080" height="1920" fill="url(#grid)"/><circle cx="1000" cy="500" r="700" fill="url(#glow)"/>
      <rect x="64" y="240" width="952" height="1420" fill="none" stroke="#ffffff" stroke-opacity=".2"/>
      <rect x="64" y="240" width="952" height="9" fill="#FF2E93"/>
      <g font-family="sans-serif" fill="#F5F2EB"><text x="112" y="340" font-size="34" font-weight="800" letter-spacing="5">CRIMEX HOUSE</text>
      <text x="112" y="420" font-size="22" letter-spacing="6" fill="#a4a4ae">PERSONAL CREW FILE / SEASON 01</text>
      <text x="100" y="690" font-size="166" font-weight="900" letter-spacing="-8">ZERO</text>
      <text x="100" y="860" font-size="166" font-weight="900" letter-spacing="-8" fill="#FF2E93">ALIBIS.</text>
      <path d="M112 970H968" stroke="#F5F2EB" stroke-opacity=".25"/>
      <text x="112" y="1040" font-size="24" letter-spacing="5" fill="#a4a4ae">CREW MEMBER</text>
      <text x="112" y="1130" font-size="48" font-weight="700">${handle}</text>
      <text x="112" y="1230" font-size="23" letter-spacing="4" fill="#a4a4ae">FILE CH-${serial}</text>
      <g transform="rotate(-4 530 1380)"><rect x="112" y="1310" width="680" height="108" fill="none" stroke="#FF2E93" stroke-width="5"/>
      <text x="144" y="1380" font-size="44" font-weight="800" letter-spacing="5" fill="#FF2E93">EVERY MOVE COUNTS</text></g>
      <text x="112" y="1530" font-size="27">THE CREW CALLS THE SHOTS.</text>
      <text x="112" y="1590" font-size="20" letter-spacing="2" fill="#a4a4ae">FICTIONAL SERIES / PERSONAL USE</text>
      <text x="540" y="1755" text-anchor="middle" font-size="24" letter-spacing="5" fill="#FF2E93">@CRIMEX.HOUSE</text></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return png;
}
