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

  /**
   * Returns support threads that have CUSTOMER messages newer than the latest
   * ADMIN reply in the same thread. Used by admin panel inbox.
   */
  static async getAdminInbox(): Promise<
    Array<{
      threadId: string;
      orderId: string | null;
      orderNumber: string | null;
      customerName: string;
      unreadCount: number;
      lastMessage: string;
      lastAt: string;
    }>
  > {
    const rows = await prisma.$queryRaw<
      Array<{
        thread_id: string;
        order_id: string | null;
        order_number: bigint | null;
        customer_name: string | null;
        unread_count: bigint;
        last_message: string;
        last_at: Date;
      }>
    >(Prisma.sql`
      with admin_anchor as (
        select thread_id, max(created_at) as anchor_at
        from public.support_messages
        where sender_role = 'ADMIN'::public.user_role_enum
        group by thread_id
      ),
      unread_msgs as (
        select sm.thread_id,
               count(*)::bigint as unread_count,
               max(sm.created_at) as last_at
        from public.support_messages sm
        left join admin_anchor a on a.thread_id = sm.thread_id
        where sm.sender_role = 'CUSTOMER'::public.user_role_enum
          and sm.created_at > coalesce(a.anchor_at, '1970-01-01'::timestamptz)
        group by sm.thread_id
      ),
      last_msg as (
        select distinct on (sm.thread_id) sm.thread_id, sm.message_text
        from public.support_messages sm
        join unread_msgs u on u.thread_id = sm.thread_id
        where sm.sender_role = 'CUSTOMER'::public.user_role_enum
          and sm.created_at = u.last_at
        order by sm.thread_id, sm.created_at desc
      )
      select st.id as thread_id,
             st.order_id,
             o.order_number as order_number,
             u.full_name as customer_name,
             um.unread_count,
             lm.message_text as last_message,
             um.last_at
      from public.support_threads st
      join unread_msgs um on um.thread_id = st.id
      join last_msg lm on lm.thread_id = st.id
      join public.users u on u.id = st.user_id
      left join public.orders o on o.id = st.order_id
      order by um.last_at desc
    `);

    return rows.map((row) => ({
      threadId: row.thread_id,
      orderId: row.order_id,
      orderNumber: row.order_number !== null ? String(row.order_number) : null,
      customerName: row.customer_name || 'Mijoz',
      unreadCount: Number(row.unread_count),
      lastMessage: row.last_message.slice(0, 100),
      lastAt: row.last_at.toISOString(),
    }));
  }

  /**
   * Fetch a single support thread by id, including all messages.
   * Admin-only (no ownership check).
   */
  static async getThreadForAdmin(threadId: string) {
    const rows = await prisma.$queryRaw<
      Array<
        SupportThreadRow & { customer_name: string | null; order_number: bigint | null }
      >
    >(Prisma.sql`
      select st.id,
             st.order_id,
             st.status,
             st.created_at,
             st.updated_at,
             st.last_message_at,
             u.full_name as customer_name,
             o.order_number as order_number
      from public.support_threads st
      join public.users u on u.id = st.user_id
      left join public.orders o on o.id = st.order_id
      where st.id = ${threadId}::uuid
      limit 1
    `);

    const thread = rows[0];
    if (!thread) return null;

    const messages = await getThreadMessages(threadId);
    return {
      thread: mapThreadRow(thread, messages),
      customerName: thread.customer_name || 'Mijoz',
      orderNumber: thread.order_number !== null ? String(thread.order_number) : null,
    };
  }

  /**
   * Admin sends a reply via the mini-app panel (not Telegram).
   * Persists to support_messages with sender_role = 'ADMIN', channel = 'MINI_APP'.
   */
  static async createAdminMessageFromPanel(input: {
    threadId: string;
    adminUserId: string;
    senderLabel: string;
    text: string;
  }) {
    const trimmed = input.text.trim();
    if (!trimmed) {
      throw new Error("Xabar bo'sh bo'lishi mumkin emas");
    }
    if (trimmed.length > 2000) {
      throw new Error("Xabar 2000 belgidan oshmasligi kerak");
    }

    return prisma.$transaction(async (tx) => {
      const threadRows = await tx.$queryRaw<
        Array<{ id: string; user_id: string; order_id: string | null }>
      >(Prisma.sql`
        select id, user_id, order_id
        from public.support_threads
        where id = ${input.threadId}::uuid
        limit 1
      `);

      const thread = threadRows[0];
      if (!thread) {
        throw new Error('Support thread topilmadi');
      }

      const inserted = await tx.$queryRaw<Array<{ id: string; created_at: Date }>>(Prisma.sql`
        insert into public.support_messages (
          thread_id,
          sender_role,
          sender_label,
          message_text,
          channel
        )
        values (
          ${input.threadId}::uuid,
          'ADMIN'::public.user_role_enum,
          ${input.senderLabel},
          ${trimmed},
          'MINI_APP'
        )
        returning id, created_at
      `);

      await tx.$executeRaw(Prisma.sql`
        update public.support_threads
        set last_message_at = now()
        where id = ${input.threadId}::uuid
      `);

      const row = inserted[0];
      return {
        id: row.id,
        threadId: input.threadId,
        userId: thread.user_id,
        orderId: thread.order_id,
        senderRole: 'ADMIN' as const,
        senderLabel: input.senderLabel,
        text: trimmed,
        channel: 'MINI_APP' as const,
        createdAt: row.created_at.toISOString(),
      };
    });
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
