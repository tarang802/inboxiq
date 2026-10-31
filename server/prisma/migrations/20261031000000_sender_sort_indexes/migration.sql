-- CreateIndex
CREATE INDEX "Sender_userId_clutterScore_idx" ON "Sender"("userId", "clutterScore");

-- CreateIndex
CREATE INDEX "Sender_userId_lastSeenAt_idx" ON "Sender"("userId", "lastSeenAt");

