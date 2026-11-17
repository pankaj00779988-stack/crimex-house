import type { Metadata } from "next";
import { CrewMissions } from "@/components/missions";
import crew from "@/data/crew.json";
export const metadata: Metadata = {
  title: "Daily Missions & Crew Credits",
  description:
    "Complete three daily challenges, earn up to 50 Crew Credits, and join the weekly Top 10 after crew verification.",
};
export default function MissionsPage() {
  return (
    <main id="main" className="page-container subpage missions-page">
      <CrewMissions
        catalog={{
          missions: crew.missions,
          reward: crew.reward,
          dailyLimit: crew.dailyLimit,
        }}
      />
    </main>
  );
}
