import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
export default function NotFound() {
  return (
    <main id="main" className="page-container not-found">
      <FileQuestion size={48} />
      <span className="eyebrow pink">404 / EVIDENCE MISSING</span>
      <h1>
        THIS FILE
        <br />
        DOESN’T EXIST.
      </h1>
      <p>
        Someone got here before you. Head back to HQ and follow the next lead.
      </p>
      <Link href="/" className="button primary">
        <ArrowLeft size={16} />
        RETURN TO HQ
      </Link>
    </main>
  );
}
