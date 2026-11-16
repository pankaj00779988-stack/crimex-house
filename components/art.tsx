"use client";
import { useState } from "react";
import Image from "next/image";
export function SceneArt({
  className = "",
  priority = false,
  src = "/art/scene_01.jpg",
}: {
  className?: string;
  priority?: boolean;
  src?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`scene-art ${className}`} aria-hidden="true">
      {!failed && (
        <Image
          src={src}
          alt=""
          fill
          sizes="(max-width: 800px) 100vw, 1200px"
          priority={priority}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
export function Avatar() {
  const [failed, setFailed] = useState(false);
  return (
    <span className="avatar">
      {failed ? (
        <span>CH</span>
      ) : (
        <Image
          src="/art/pfp.jpg"
          alt=""
          width={32}
          height={32}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
