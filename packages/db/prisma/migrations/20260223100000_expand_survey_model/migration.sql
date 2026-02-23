-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('link', 'app');

-- CreateEnum
CREATE TYPE "SurveyDisplayOption" AS ENUM ('displayOnce', 'displayMultiple', 'respondMultiple', 'displaySome');

-- AlterTable: Survey 모델 확장
ALTER TABLE "surveys"
    ADD COLUMN "type" "SurveyType" NOT NULL DEFAULT 'link',
    ADD COLUMN "creatorId" TEXT,
    ADD COLUMN "schema" JSONB NOT NULL DEFAULT '{"root":[],"entities":{}}',
    ADD COLUMN "welcomeCard" JSONB NOT NULL DEFAULT '{"enabled":false}',
    ADD COLUMN "endings" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "hiddenFields" JSONB NOT NULL DEFAULT '{"enabled":false,"fieldIds":[]}',
    ADD COLUMN "variables" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "followUps" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "triggers" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "displayOption" "SurveyDisplayOption" NOT NULL DEFAULT 'displayOnce',
    ADD COLUMN "displayLimit" INTEGER,
    ADD COLUMN "displayPercentage" DOUBLE PRECISION,
    ADD COLUMN "delay" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "autoClose" INTEGER,
    ADD COLUMN "autoComplete" INTEGER,
    ADD COLUMN "recontactDays" INTEGER,
    ADD COLUMN "pin" TEXT,
    ADD COLUMN "singleUse" JSONB,
    ADD COLUMN "slug" TEXT,
    ADD COLUMN "recaptcha" JSONB,
    ADD COLUMN "styling" JSONB,
    ADD COLUMN "projectOverwrites" JSONB,
    ADD COLUMN "surveyMetadata" JSONB,
    ADD COLUMN "customHeadScript" TEXT,
    ADD COLUMN "segment" JSONB,
    ADD COLUMN "languages" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "isVerifyEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "isSingleResponsePerEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "isBackButtonHidden" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "isIpCollectionEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "showLanguageSwitch" BOOLEAN;

-- DropColumn: questions 제거
ALTER TABLE "surveys" DROP COLUMN "questions";

-- CreateIndex
CREATE UNIQUE INDEX "surveys_slug_key" ON "surveys"("slug");

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
