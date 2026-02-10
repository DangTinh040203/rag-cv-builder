-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "demo" TEXT,
ADD COLUMN     "domain" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "position" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "responsibilities" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "technologies" TEXT NOT NULL DEFAULT '';
