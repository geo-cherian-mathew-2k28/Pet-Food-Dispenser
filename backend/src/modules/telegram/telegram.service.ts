// SmartCat Feeder - Telegram Bot Service
// Private Telegram bot that lets authorized users control the feeder.

import { Telegraf, Context, Markup } from 'telegraf';
import { env } from '../../config/env';
import { triggerFeed } from '../feeds/feed.service';
import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';

let bot: Telegraf | null = null;

function isAdmin(ctx: Context): boolean {
  const chatId = ctx.chat?.id?.toString();
  return !!(env.telegram.adminTelegramChatId && chatId === env.telegram.adminTelegramChatId);
}

async function isAuthorized(ctx: Context): Promise<boolean> {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return false;
  if (env.telegram.adminTelegramChatId && chatId === env.telegram.adminTelegramChatId) return true;
  if (env.telegram.allowedChatIds.includes(chatId)) return true;

  // Check in database for linked accounts
  try {
    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId }
    });
    return !!user;
  } catch (err) {
    logger.error('Failed to query user authorization from database:', err);
    return false;
  }
}

async function denyAccess(ctx: Context): Promise<void> {
  await ctx.reply('Access denied. This feeder is private.');
  logger.warn(`Unauthorized Telegram access attempt from chat ID: ${ctx.chat?.id}`);
}

// ── Keyboards shown to users/admins ───────────────────────────────────────────
const mainKeyboard = Markup.keyboard([
  ['Feed Now', 'Status'],
  ['History', 'Today'],
]).resize();

const adminKeyboard = Markup.keyboard([
  ['Feed Now', 'Status'],
  ['History', 'Today'],
  ['Manage Users'],
]).resize();

// Helper to get active keyboard based on role
function getKeyboard(ctx: Context) {
  return isAdmin(ctx) ? adminKeyboard : mainKeyboard;
}

// ── Helper: run a feed and reply ──────────────────────────────────────────────
async function doFeed(ctx: Context): Promise<void> {
  const userName = (ctx.from?.first_name || '') + (ctx.from?.last_name ? ` ${ctx.from.last_name}` : '') || `User ${ctx.chat?.id}`;
  const keyboard = getKeyboard(ctx);
  await ctx.reply('Feeding... please wait', keyboard);

  try {
    const result = await triggerFeed({ source: 'TELEGRAM', userName, portion: 1 });
    if (result.success) {
      await ctx.reply(`Food dispensed successfully!\n\nRequest ID: ${result.requestId}`, keyboard);
    } else {
      await ctx.reply(`Failed to dispense food.\n\nReason: ${result.message}`, keyboard);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await ctx.reply(`Error: ${message}`, keyboard);
  }
}

// ── Helper: get status and reply ─────────────────────────────────────────────
async function doStatus(ctx: Context): Promise<void> {
  const keyboard = getKeyboard(ctx);
  try {
    const device = await prisma.deviceStatus.findUnique({ where: { id: 'device-1' } });

    if (!device) {
      await ctx.reply('Device status: OFFLINE\n\nNo heartbeat received yet. Is the Arduino powered on?', keyboard);
      return;
    }

    const lastHeartbeat = device.lastHeartbeatAt
      ? new Date(device.lastHeartbeatAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : 'Never';

    const lastFeed = await prisma.feedLog.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { completedAt: 'desc' },
    });

    const lastFeedTime = lastFeed?.completedAt
      ? new Date(lastFeed.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : 'Never';

    const statusText = device.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE';

    await ctx.reply(
      `Device Status: ${statusText}\n\n` +
      `Last heartbeat: ${lastHeartbeat}\n` +
      `Last feed: ${lastFeedTime}\n` +
      `WiFi signal: ${device.wifiStrength ? `${device.wifiStrength} dBm` : 'N/A'}\n` +
      `Uptime: ${device.uptimeSeconds ? `${Math.floor(device.uptimeSeconds / 60)} min ${device.uptimeSeconds % 60} sec` : 'N/A'}`,
      keyboard
    );
  } catch (_err) {
    await ctx.reply('Failed to retrieve device status.', keyboard);
  }
}

// ── Helper: get history and reply ─────────────────────────────────────────────
async function doHistory(ctx: Context): Promise<void> {
  const keyboard = getKeyboard(ctx);
  try {
    const feeds = await prisma.feedLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (feeds.length === 0) {
      await ctx.reply('No feeding history yet. Press Feed Now to get started!', keyboard);
      return;
    }

    const lines = feeds.map((f) => {
      const statusIcon = f.status === 'SUCCESS' ? '[OK]' : f.status === 'FAILED' ? '[ERR]' : '[PENDING]';
      const time = new Date(f.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      return `${statusIcon} ${time}\nSource: ${f.source} | Portion: ${f.portion}\n${f.message || ''}`;
    });

    await ctx.reply(`Last 5 Feedings:\n\n${lines.join('\n\n')}`, keyboard);
  } catch (_err) {
    await ctx.reply('Failed to retrieve feed history.', keyboard);
  }
}

// ── Helper: today count ───────────────────────────────────────────────────────
async function doToday(ctx: Context): Promise<void> {
  const keyboard = getKeyboard(ctx);
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = await prisma.feedLog.count({
      where: { createdAt: { gte: todayStart }, status: 'SUCCESS' },
    });
    const device = await prisma.deviceStatus.findUnique({ where: { id: 'device-1' } });
    const maxFeeds = device?.maxFeedsPerDay ?? env.maxFeedsPerDay;
    await ctx.reply(`Today's successful feeds: ${count} / ${maxFeeds}`, keyboard);
  } catch (_err) {
    await ctx.reply("Failed to get today's feed count.", keyboard);
  }
}

// ── Helper: manage users list (Admin Only) ───────────────────────────────────
async function doManageUsers(ctx: Context): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply('Access denied. Administrator privileges required.');
    return;
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (users.length === 0) {
      await ctx.reply('No registered users found.', adminKeyboard);
      return;
    }

    await ctx.reply('System Users (Manage accounts):', adminKeyboard);

    for (const u of users) {
      const isUserAdmin = u.role === 'ADMIN';
      const roleText = isUserAdmin ? 'Admin' : 'User';
      const tgText = u.telegramChatId ? u.telegramChatId : 'Not linked';

      const userMessage =
        `Name: ${u.name}\n` +
        `Email: ${u.email}\n` +
        `Role: ${roleText}\n` +
        `Telegram ID: ${tgText}`;

      // Only show remove button if user is not an admin
      if (u.role !== 'ADMIN') {
        const deleteButton = Markup.inlineKeyboard([
          Markup.button.callback(`Remove ${u.name}`, `deluser:${u.id}`)
        ]);
        await ctx.reply(userMessage, deleteButton);
      } else {
        await ctx.reply(userMessage);
      }
    }
  } catch (err) {
    logger.error('Failed to list users in Telegram:', err);
    await ctx.reply('Failed to retrieve system users.', adminKeyboard);
  }
}

// =============================================================================
//  Bot Initialization
// =============================================================================
export function startTelegramBot(): void {
  if (!env.telegram.botToken || env.telegram.botToken === 'your-telegram-bot-token') {
    logger.warn('Telegram bot token not configured — bot will not start');
    return;
  }

  bot = new Telegraf(env.telegram.botToken);

  // Register commands for the Telegram command menu
  bot.telegram.setMyCommands([
    { command: 'feed', description: 'Dispense food now' },
    { command: 'status', description: 'Check device online/offline status' },
    { command: 'history', description: 'Show last 5 feedings' },
    { command: 'today', description: "Show today's successful feed count" },
    { command: 'users', description: 'Manage system users (Admin)' },
    { command: 'setlimit', description: 'Set daily feed limit (Admin)' },
    { command: 'start', description: 'Welcome message' },
    { command: 'help', description: 'Show command list' }
  ]).catch(err => logger.error('Failed to set Telegram commands:', err));

  // Inline keyboard for quick actions
  const quickActionsKeyboard = Markup.inlineKeyboard([
    Markup.button.callback('Feed Now', 'feed_now'),
    Markup.button.callback('Device Status', 'device_status')
  ]);

  // Handle inline keyboard button clicks
  bot.action('feed_now', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    try {
      await ctx.answerCbQuery();
    } catch (_) {}
    await doFeed(ctx);
  });

  bot.action('device_status', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    try {
      await ctx.answerCbQuery();
    } catch (_) {}
    await doStatus(ctx);
  });

  // Handle user deletion callback
  bot.action(/^deluser:(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return denyAccess(ctx);

    const userId = ctx.match[1];
    try {
      await ctx.answerCbQuery();
    } catch (_) {}

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        await ctx.reply('User not found.');
        return;
      }

      if (user.role === 'ADMIN') {
        await ctx.reply('Cannot delete the administrator.');
        return;
      }

      // Delete user and cascade schedules/feedlogs
      await prisma.feedLog.deleteMany({ where: { userId } });
      await prisma.schedule.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });

      await ctx.reply(`Successfully removed user ${user.name} (${user.email}) from website and Telegram.`);
    } catch (err) {
      logger.error('Failed to delete user via Telegram:', err);
      await ctx.reply('Failed to delete user.');
    }
  });

  // ── /start ────────────────────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    if (!(await isAuthorized(ctx))) {
      await ctx.reply(
        `Access Denied\n\nThis feeder is private.\n\n` +
        `Your Chat ID is: ${ctx.chat?.id}\n` +
        `Ask the owner to link this Chat ID to your user profile on the website.`
      );
      logger.warn(`Unauthorized /start from chat ID: ${ctx.chat?.id}`);
      return;
    }

    const keyboard = getKeyboard(ctx);
    await ctx.reply(
      `Welcome to SmartCat Feeder!\n\n` +
      `Hello ${ctx.from?.first_name || 'there'}! Use the buttons below to control your feeder.\n\n` +
      `Commands:\n` +
      `/feed — Feed now\n` +
      `/status — Device status\n` +
      `/history — Last 5 feeds\n` +
      `/today — Today's feed count\n` +
      (isAdmin(ctx) ? `/users — Manage system users\n` : '') +
      `/help — Show this menu`,
      keyboard
    );
    // Also send quick inline buttons for instant feeding
    await ctx.reply('Quick controls:', quickActionsKeyboard);
  });

  // ── /help ─────────────────────────────────────────────────────────────────
  bot.command('help', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    const keyboard = getKeyboard(ctx);
    await ctx.reply(
      `SmartCat Feeder Commands\n\n` +
      `/feed — Dispense food now\n` +
      `/status — Check device online/offline status\n` +
      `/history — Show last 5 feedings\n` +
      `/today — Show today's successful feed count\n` +
      (isAdmin(ctx) ? `/users — Manage users\n` : '') +
      `/start — Welcome message`,
      keyboard
    );
  });

  // ── /feed ─────────────────────────────────────────────────────────────────
  bot.command('feed', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    await doFeed(ctx);
  });

  // ── /status ───────────────────────────────────────────────────────────────
  bot.command('status', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    await doStatus(ctx);
  });

  // ── /history ──────────────────────────────────────────────────────────────
  bot.command('history', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    await doHistory(ctx);
  });

  // ── /today ────────────────────────────────────────────────────────────────
  bot.command('today', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    await doToday(ctx);
  });

  // ── /users ────────────────────────────────────────────────────────────────
  bot.command('users', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    await doManageUsers(ctx);
  });

  // ── /setlimit /limit ──────────────────────────────────────────────────────
  bot.command(['setlimit', 'limit'], async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('Access denied. Administrator privileges required.');
      return;
    }
    const messageText = ctx.message.text.trim();
    const args = messageText.split(/\s+/).slice(1);
    if (args.length === 0 || isNaN(Number(args[0]))) {
      await ctx.reply('Please specify a valid daily feed limit, e.g. /setlimit 5');
      return;
    }
    const limitVal = parseInt(args[0], 10);
    if (limitVal <= 0 || limitVal > 100) {
      await ctx.reply('Please specify a limit between 1 and 100.');
      return;
    }
    try {
      await prisma.deviceStatus.upsert({
        where: { id: 'device-1' },
        update: { maxFeedsPerDay: limitVal },
        create: { id: 'device-1', status: 'OFFLINE', maxFeedsPerDay: limitVal },
      });
      await ctx.reply(`Daily feed limit has been updated to ${limitVal} feeds per day.`);
    } catch (err) {
      logger.error('Failed to update maxFeedsPerDay:', err);
      await ctx.reply('Failed to update the daily feed limit in the database.');
    }
  });

  // ── Keyboard button + free-text handler ───────────────────────────────────
  bot.on('text', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);

    const text = ctx.message.text.trim().toLowerCase();

    if (text === 'feed now' || text === 'feed' || text === '/feed') {
      return doFeed(ctx);
    }
    if (text === 'status' || text === 'status') {
      return doStatus(ctx);
    }
    if (text === 'history' || text === 'history') {
      return doHistory(ctx);
    }
    if (text === 'today' || text === 'today') {
      return doToday(ctx);
    }
    if (text === 'manage users' || text === 'users' || text === '/users') {
      return doManageUsers(ctx);
    }

    // Catch-all text: show menu
    const keyboard = getKeyboard(ctx);
    await ctx.reply(
      `I didn't understand that.\n\nUse the buttons below or type:\n` +
      `• /feed — Feed your cat\n• /status — Device status\n• /history — Feed history\n• /today — Today's count` +
      (isAdmin(ctx) ? `\n• /users — Manage system users` : ''),
      keyboard
    );
  });

  // ── Catch-all for non-text messages (stickers, photos, voice, etc.) ──────
  bot.on('message', async (ctx) => {
    if (!(await isAuthorized(ctx))) return denyAccess(ctx);
    const keyboard = getKeyboard(ctx);
    await ctx.reply(
      `Non-text inputs are not supported.\n\nUse the buttons below or type:\n` +
      `• /feed — Feed your cat\n• /status — Device status\n• /history — Feed history\n• /today — Today's count` +
      (isAdmin(ctx) ? `\n• /users — Manage system users` : ''),
      keyboard
    );
  });

  // Launch with long polling
  bot.launch().then(() => {
    logger.info('🤖 Telegram bot started successfully');
  }).catch((err) => {
    logger.error('Telegram bot failed to start:', err);
  });

  // Graceful shutdown
  process.once('SIGINT', () => bot?.stop('SIGINT'));
  process.once('SIGTERM', () => bot?.stop('SIGTERM'));
}

export function getTelegramBot(): Telegraf | null {
  return bot;
}
