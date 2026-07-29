-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "meetingDate" DATETIME NOT NULL,
    "rawContent" TEXT NOT NULL,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'action',
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "dueDate" DATETIME,
    "priority" TEXT,
    "status" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "sourceExcerpt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "meetingId" TEXT NOT NULL,
    CONSTRAINT "Item_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Item_kind_status_idx" ON "Item"("kind", "status");

-- CreateIndex
CREATE INDEX "Item_dueDate_idx" ON "Item"("dueDate");

-- CreateIndex
CREATE INDEX "Item_meetingId_idx" ON "Item"("meetingId");
