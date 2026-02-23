-- CreateEnum: API 키 권한 수준
CREATE TYPE "ApiKeyPermission" AS ENUM ('READ', 'WRITE', 'MANAGE');

-- CreateEnum: 설문조사 상태
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'PAUSED', 'COMPLETED');

-- AlterTable: api_keys - environmentId 제거, organizationId 추가
-- 기존 데이터가 있을 경우를 대비해 먼저 컬럼을 추가하고 인덱스/FK를 설정한 후 기존 컬럼 제거
ALTER TABLE "api_keys" ADD COLUMN "organizationId" TEXT;

-- 기존 데이터가 있으면 환경을 통해 organizationId를 역추적
-- (빈 DB에서는 영향 없음, 기존 데이터가 있으면 환경 → 프로젝트 → 조직 경로로 추적)
UPDATE "api_keys" ak
SET "organizationId" = (
  SELECT p."organizationId"
  FROM "environments" e
  JOIN "projects" p ON p."id" = e."projectId"
  WHERE e."id" = ak."environmentId"
)
WHERE ak."organizationId" IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'environmentId');

-- organizationId를 NOT NULL로 변경
ALTER TABLE "api_keys" ALTER COLUMN "organizationId" SET NOT NULL;

-- 기존 environmentId 컬럼 제거
ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "environmentId";

-- CreateIndex: api_keys organizationId 인덱스
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

-- AddForeignKey: api_keys → organizations
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: api_key_environment_permissions
CREATE TABLE "api_key_environment_permissions" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "permission" "ApiKeyPermission" NOT NULL,

    CONSTRAINT "api_key_environment_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: api_key_environment_permissions unique (apiKeyId, environmentId)
CREATE UNIQUE INDEX "api_key_environment_permissions_apiKeyId_environmentId_key" ON "api_key_environment_permissions"("apiKeyId", "environmentId");

-- CreateIndex: api_key_environment_permissions environmentId 인덱스
CREATE INDEX "api_key_environment_permissions_environmentId_idx" ON "api_key_environment_permissions"("environmentId");

-- AddForeignKey: api_key_environment_permissions → api_keys
ALTER TABLE "api_key_environment_permissions" ADD CONSTRAINT "api_key_environment_permissions_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: api_key_environment_permissions → environments
ALTER TABLE "api_key_environment_permissions" ADD CONSTRAINT "api_key_environment_permissions_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: surveys (스텁)
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "questions" JSONB NOT NULL DEFAULT '[]',
    "environmentId" TEXT NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: surveys environmentId 인덱스
CREATE INDEX "surveys_environmentId_idx" ON "surveys"("environmentId");

-- AddForeignKey: surveys → environments
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: responses (스텁)
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "meta" JSONB,
    "variables" JSONB,
    "ttc" JSONB,
    "hiddenFields" JSONB,
    "language" TEXT,
    "surveyId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "contactId" TEXT,
    "displayId" TEXT,
    "endingId" TEXT,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: responses surveyId 인덱스
CREATE INDEX "responses_surveyId_idx" ON "responses"("surveyId");

-- CreateIndex: responses environmentId 인덱스
CREATE INDEX "responses_environmentId_idx" ON "responses"("environmentId");

-- CreateIndex: responses contactId 인덱스
CREATE INDEX "responses_contactId_idx" ON "responses"("contactId");

-- AddForeignKey: responses → surveys
ALTER TABLE "responses" ADD CONSTRAINT "responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: responses → environments
ALTER TABLE "responses" ADD CONSTRAINT "responses_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: responses → contacts (SetNull)
ALTER TABLE "responses" ADD CONSTRAINT "responses_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: responses → displays
ALTER TABLE "responses" ADD CONSTRAINT "responses_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "displays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: displays (스텁)
CREATE TABLE "displays" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "surveyId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,

    CONSTRAINT "displays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: displays surveyId 인덱스
CREATE INDEX "displays_surveyId_idx" ON "displays"("surveyId");

-- CreateIndex: displays environmentId 인덱스
CREATE INDEX "displays_environmentId_idx" ON "displays"("environmentId");

-- AddForeignKey: displays → surveys
ALTER TABLE "displays" ADD CONSTRAINT "displays_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: displays → environments
ALTER TABLE "displays" ADD CONSTRAINT "displays_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: contacts (스텁)
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "environmentId" TEXT NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: contacts environmentId 인덱스
CREATE INDEX "contacts_environmentId_idx" ON "contacts"("environmentId");

-- AddForeignKey: contacts → environments
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
