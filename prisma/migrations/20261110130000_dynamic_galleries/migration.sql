-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "label" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- The three built-in galleries used to live in code. Make each one a real row. A row an admin already edited keeps its
-- heading, tagline and description; only the new label and position are set.
INSERT INTO "Category" ("slug", "label", "heading", "tagline", "description", "position", "hidden") VALUES
  ('families', 'Families', 'Family Photography', 'Real connection, unhurried',
   'Family photos should feel effortless, natural, and fun. As a husband-and-wife team, we work together to create a relaxed, enjoyable experience while capturing genuine moments against Colorado’s beautiful backdrops—whether you have a favorite location in mind or let us find the perfect spot for you.',
   0, false),
  ('couples', 'Couples', 'Couples Shoots', 'Quiet moments, honest light',
   'Whether you’re just beginning your journey together or have been married for decades, we’re here to capture the love and connection that make your relationship unique. From candid laughter to quiet, intimate moments, we’ll help you create beautiful memories to look back on for years to come.',
   1, false),
  ('events', 'Events', 'Events', 'Energy, atmosphere, defining moments',
   'From dimly lit concert venues and dynamic dance performances to corporate celebrations and large-scale events, we capture the energy, atmosphere, and defining moments that make every occasion unique.',
   2, false)
ON CONFLICT ("slug") DO UPDATE SET "label" = EXCLUDED."label", "position" = EXCLUDED."position";

-- Holding gallery for photos whose gallery was deleted. Admin only: never shown on the public site.
INSERT INTO "Category" ("slug", "label", "heading", "tagline", "description", "position", "hidden") VALUES
  ('unassigned', 'Unassigned photos', 'Unassigned photos', '', '', 1000, true)
ON CONFLICT ("slug") DO NOTHING;

-- The default was only there to fill existing rows.
ALTER TABLE "Category" ALTER COLUMN "label" DROP DEFAULT;
