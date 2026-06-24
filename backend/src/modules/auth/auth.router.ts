// SmartCat Feeder - Auth Routes
// Handles user registration, login, and profile retrieval.

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';

export const authRouter = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Register ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Sign JWT
    const jwtOptions: SignOptions = { expiresIn: (env.jwtExpiresIn || '7d') as SignOptions['expiresIn'] };
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.jwtSecret,
      jwtOptions
    );

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Auto-elevate to ADMIN if Telegram Chat ID matches the owner's chat ID
    if (user.telegramChatId === '1690543934' && user.role !== 'ADMIN') {
      user.role = 'ADMIN';
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    }

    const jwtOptions2: SignOptions = { expiresIn: (env.jwtExpiresIn || '7d') as SignOptions['expiresIn'] };
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.jwtSecret,
      jwtOptions2
    );

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
});

// ─── Me ───────────────────────────────────────────────────────────────────────
// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, telegramChatId: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Auto-elevate to ADMIN if Telegram Chat ID matches the owner's chat ID
    if (user.telegramChatId === '1690543934' && user.role !== 'ADMIN') {
      user.role = 'ADMIN';
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ─── Update Profile ───────────────────────────────────────────────────────────
// PUT /api/auth/profile
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  telegramChatId: z.string().optional().nullable(),
});

authRouter.put('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, telegramChatId } = profileSchema.parse(req.body);

    // Check if email taken by someone else
    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: req.user!.userId },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Email is already taken by another account' });
      return;
    }

    // Determine role update (if telegram ID matches the admin chat ID or owner's chat ID, elevate to ADMIN)
    const isNewAdmin = (env.telegram.adminTelegramChatId && telegramChatId === env.telegram.adminTelegramChatId) || telegramChatId === '1690543934';
    const newRole = isNewAdmin ? 'ADMIN' : undefined;

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        name,
        email,
        telegramChatId: telegramChatId || null,
        ...(newRole ? { role: newRole } : {}),
      },
      select: { id: true, name: true, email: true, role: true, telegramChatId: true, createdAt: true },
    });

    // If role changed, sign new token
    let token: string | undefined;
    if (newRole && req.user!.role !== 'ADMIN') {
      const jwtOptions: SignOptions = { expiresIn: (env.jwtExpiresIn || '7d') as SignOptions['expiresIn'] };
      token = jwt.sign(
        { userId: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
        env.jwtSecret,
        jwtOptions
      );
    }

    res.json({ user: updatedUser, ...(token ? { token } : {}) });
  } catch (err) {
    next(err);
  }
});

// ─── List Users (Admin Only) ──────────────────────────────────────────────────
// GET /api/auth/users
authRouter.get('/users', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, telegramChatId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// ─── Delete User (Admin Only) ──────────────────────────────────────────────────
// DELETE /api/auth/users/:id
authRouter.delete('/users/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (id === req.user!.userId) {
      res.status(400).json({ error: 'You cannot delete your own admin account.' });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete associated feed logs and schedules first to prevent foreign key constraint issues
    await prisma.feedLog.deleteMany({ where: { userId: id } });
    await prisma.schedule.deleteMany({ where: { userId: id } });

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

