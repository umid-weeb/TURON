import { Prisma } from '@prisma/client';
import { UserRoleEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface SupportMessageDto {
  id: string;
  senderRole: UserRoleEnum;
  senderLabel: string;
  text: string;
  channel: 'MINI_APP' | 'TELEGRAM';
  createdAt: string;
}

export interface SupportThreadDto {
  id: string;
  orderId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messages: SupportMessageDto[];
}

type SupportThreadRow = {
  id: string;
  order_id: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date;
};

type SupportMessageRow = {
  id: string;
  sender_role: UserRoleEnum;
  sender_label: string;
  message_text: string;
  channel: 'MINI_APP' | 'TELEGRAM';
  created_at: Date;
};

function mapThreadRow(row: SupportThreadRow, messages: SupportMessageDto[]): SupportThreadDto {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastMessageAt: row.last_message_at.toISOString(),
    messages,
  };
}

function mapMessageRow(row: SupportMessageRow): SupportMessageDto {
  return {
    id: row.id,
    senderRole: row.sender_role,
    senderLabel: row.sender_label,
    text: row.message_text,
    channel: row.channel,
    createdAt: row.created_at.toISOString(),
  };
}

async function findLatestThread(userId: string, orderId?: string | null, tx: DbClient = prisma) {
  if (orderId) {
    const rows = await tx.$queryRaw<SupportThreadRow[]>(Prisma.sql`
      select id, order_id, status, created_at, updated_at, last_message_at
      from public.support_threads
      where user_id = ${userId}::uuid and order_id = ${orderId}::uuid
      order by last_message_at desc
      limit 1
    `);

    return rows[0] || null;
  }

  const rows = await tx.$queryRaw<SupportThreadRow[]>(Prisma.sql`
    select id, order_id, status, created_at, updated_at, last_message_at
    from public.support_threads
    where user_id = ${userId}::uuid and order_id is null
    order by last_message_at desc
    limit 1
  `);

  return rows[0] || null;
}

async function insertThread(userId: string, orderId?: string | null, tx: DbClient = prisma) {
  const rows = await tx.$queryRaw<SupportThreadRow[]>(Prisma.sql`
    insert into public.support_threads (user_id, order_id)
    values (${userId}::uuid, ${orderId ? Prisma.sql`${orderId}::uuid` : Prisma.sql`null`})
    returning id, order_id, status, created_at, updated_at, last_message_at
  `);

  return rows[0];
}

async function getThreadMessages(threadId: string, tx: DbClient = prisma) {
  const rows = await tx.$queryRaw<SupportMessageRow[]>(Prisma.sql`
    select id, sender_role, sender_label, message_text, channel, created_at
    from public.support_messages
    where thread_id = ${threadId}::uuid
    order by created_at asc
  `);

  return rows.map(mapMessageRow);
}

export class SupportService {
  static async ensureCustomerThread(userId: string, orderId?: string | null) {
    const existing = await findLatestThread(userId, orderId);
    return existing || insertThread(userId, orderId);
  }

  static async getCustomerThread(userId: string, orderId?: string | null) {
    const thread = await this.ensureCustomerThread(userId, orderId);
    const messages = await getThreadMessages(thread.id);
    return mapThreadRow(thread, messages);
  }

  static async createCustomerMessage(input: {
    userId: string;
    orderId?: string | null;
    senderLabel: string;
    text: string;
  }) {
    const { userId, orderId, senderLabel, text } = input;

    return prisma.$transaction(async (tx) => {
      const thread = (await findLatestThread(userId, orderId, tx)) || (await insertThread(userId, orderId, tx));

      const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        insert into public.support_messages (
          thread_id,
          sender_role,
          sender_label,
          message_text,
          channel
        )
        values (
          ${thread.id}::uuid,
          'CUSTOMER'::public.user_role_enum,
          ${senderLabel},
          ${text},
          'MINI_APP'
        )
        returning id
      `);

      await tx.$executeRaw(Prisma.sql`
        update public.support_threads
        set last_message_at = now()
        where id = ${thread.id}::uuid
      `);

      const refreshedThread = await findLatestThread(userId, orderId, tx);
      const messages = await getThreadMessages(thread.id, tx);

      return {
        thread: mapThreadRow(refreshedThread || thread, messages),
        messageId: rows[0]?.id,
      };
    });
  }

  static async attachTelegramMetadata(
    supportMessageId: string,
    params: {
      telegramChatId: string;
      telegramMessageId: number;
    },
  ) {
    await prisma.$executeRaw(Prisma.sql`
      update public.support_messages
      set
        telegram_chat_id = ${BigInt(params.telegramChatId)},
        telegram_message_id = ${params.telegramMessageId}
      where id = ${supportMessageId}::uuid
    `);
  }

  static async createAdminReplyFromTelegram(input: {
    adminChatId: string;
    telegramMessageId: number;
    replyToTelegramMessageId: number;
    senderLabel: string;
    text: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const sourceRows = await tx.$queryRaw<Array<{ thread_id: string; user_id: string; order_id: string | null }>>(Prisma.sql`
        select st.id as thread_id, st.user_id, st.order_id
        from public.support_messages sm
        join public.support_threads st on st.id = sm.thread_id
        where sm.telegram_chat_id = ${BigInt(input.adminChatId)}
          and sm.telegram_message_id = ${input.replyToTelegramMessageId}
        order by sm.created_at desc
        limit 1
      `);

      const source = sourceRows[0];
      if (!source) {
        return null;
      }

      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        insert into public.support_messages (
          thread_id,
          sender_role,
          sender_label,
          message_text,
          channel,
          telegram_chat_id,
          telegram_message_id,
          reply_to_telegram_message_id
        )
        values (
          ${source.thread_id}::uuid,
          'ADMIN'::public.user_role_enum,
          ${input.senderLabel},
          ${input.text},
          'TELEGRAM',
          ${BigInt(input.adminChatId)},
          ${input.telegramMessageId},
          ${input.replyToTelegramMessageId}
        )
        returning id
      `);

      await tx.$executeRaw(Prisma.sql`
        update public.support_threads
        set last_message_at = now()
        where id = ${source.thread_id}::uuid
      `);

      const refreshedThread = await findLatestThread(source.user_id, source.order_id, tx);
      const messages = await getThreadMessages(source.thread_id, tx);

      return refreshedThread ? mapThreadRow(refreshedThread, messages) : null;
    });
  }
}
