-- CreateEnum
CREATE TYPE "lifecycle_state" AS ENUM ('alive', 'dead', 'despawned');

-- CreateEnum
CREATE TYPE "guild_role" AS ENUM ('member', 'officer', 'leader');

-- CreateEnum
CREATE TYPE "friendship_status" AS ENUM ('pending', 'accepted', 'blocked');

-- CreateEnum
CREATE TYPE "currency_type" AS ENUM ('coins', 'seeds', 'gems');

-- CreateEnum
CREATE TYPE "subscription_tier" AS ENUM ('monthly', 'quarterly', 'yearly');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'canceled', 'expired', 'grace_period');

-- CreateEnum
CREATE TYPE "billing_platform" AS ENUM ('google_play', 'apple_app_store');

-- CreateEnum
CREATE TYPE "chat_scope" AS ENUM ('global', 'guild', 'dm');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creatures" (
    "id" UUID NOT NULL,
    "owner_id" UUID,
    "species" TEXT NOT NULL,
    "name" TEXT,
    "chunk_id" INTEGER NOT NULL,
    "personality_traits" JSONB NOT NULL,
    "genetics" JSONB NOT NULL,
    "lifecycle_state" "lifecycle_state" NOT NULL DEFAULT 'alive',
    "born_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "died_at" TIMESTAMPTZ,

    CONSTRAINT "creatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_chunks" (
    "id" SERIAL NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "biome" TEXT NOT NULL,
    "shard_id" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "world_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_log" (
    "id" BIGSERIAL NOT NULL,
    "creature_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "tick" BIGINT NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "leader_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_members" (
    "guild_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "guild_role" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("guild_id","user_id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "requester_id" UUID NOT NULL,
    "addressee_id" UUID NOT NULL,
    "status" "friendship_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("requester_id","addressee_id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "user_id" UUID NOT NULL,
    "coins" BIGINT NOT NULL DEFAULT 0,
    "seeds" BIGINT NOT NULL DEFAULT 0,
    "gems" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" BIGSERIAL NOT NULL,
    "wallet_id" UUID NOT NULL,
    "currency" "currency_type" NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "acquired_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creature_cosmetics" (
    "creature_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "slot" TEXT NOT NULL,

    CONSTRAINT "creature_cosmetics_pkey" PRIMARY KEY ("creature_id","slot")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "user_id" UUID NOT NULL,
    "tier" "subscription_tier" NOT NULL,
    "platform" "billing_platform" NOT NULL,
    "platform_subscription_id" TEXT NOT NULL,
    "status" "subscription_status" NOT NULL,
    "current_period_end" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "sender_id" UUID NOT NULL,
    "scope" "chat_scope" NOT NULL,
    "scope_id" UUID,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "creatures_owner_id_idx" ON "creatures"("owner_id");

-- CreateIndex
CREATE INDEX "creatures_chunk_id_idx" ON "creatures"("chunk_id");

-- CreateIndex
CREATE INDEX "world_chunks_shard_id_idx" ON "world_chunks"("shard_id");

-- CreateIndex
CREATE UNIQUE INDEX "world_chunks_x_y_key" ON "world_chunks"("x", "y");

-- CreateIndex
CREATE INDEX "event_log_creature_id_occurred_at_idx" ON "event_log"("creature_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "guild_members_user_id_key" ON "guild_members"("user_id");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_created_at_idx" ON "transactions"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_items_user_id_idx" ON "inventory_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_platform_platform_subscription_id_key" ON "subscriptions"("platform", "platform_subscription_id");

-- CreateIndex
CREATE INDEX "chat_messages_scope_scope_id_sent_at_idx" ON "chat_messages"("scope", "scope_id", "sent_at");

-- AddForeignKey
ALTER TABLE "creatures" ADD CONSTRAINT "creatures_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatures" ADD CONSTRAINT "creatures_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "world_chunks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_creature_id_fkey" FOREIGN KEY ("creature_id") REFERENCES "creatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creature_cosmetics" ADD CONSTRAINT "creature_cosmetics_creature_id_fkey" FOREIGN KEY ("creature_id") REFERENCES "creatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creature_cosmetics" ADD CONSTRAINT "creature_cosmetics_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
