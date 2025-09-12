-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateTable
CREATE TABLE "public"."Message" (
    "messageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "claimId" TEXT,
    "dmKey" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "public"."ConversationRead" (
    "userId" TEXT NOT NULL,
    "conversationKey" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationRead_pkey" PRIMARY KEY ("userId","conversationKey")
);

-- CreateIndex
CREATE INDEX "Message_claimId_createdDate_idx" ON "public"."Message"("claimId", "createdDate");

-- CreateIndex
CREATE INDEX "Message_dmKey_createdDate_idx" ON "public"."Message"("dmKey", "createdDate");

-- CreateIndex
CREATE INDEX "Message_senderId_createdDate_idx" ON "public"."Message"("senderId", "createdDate");

-- CreateIndex
CREATE INDEX "Message_receiverId_createdDate_idx" ON "public"."Message"("receiverId", "createdDate");

-- CreateIndex
CREATE INDEX "ConversationRead_conversationKey_idx" ON "public"."ConversationRead"("conversationKey");

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "public"."claims"("claimId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationRead" ADD CONSTRAINT "ConversationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
