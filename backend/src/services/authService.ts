import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository, UserEntity } from '../repositories/userRepository';
import { getDatabase } from '../database/connection';
import { config } from '../config';

export interface UserTokenPayload {
  userId: string;
  email: string;
  role: 'public_user' | 'researcher' | 'admin_maintainer';
  exp: number;
}

export class AuthService {
  constructor(private userRepo: UserRepository = new UserRepository()) {}

  public hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  public generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public generateToken(user: UserEntity): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const payload: UserTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.security.jwtSecret)
      .update(`${header}.${encodedPayload}`)
      .digest('base64url');

    return `${header}.${encodedPayload}.${signature}`;
  }

  public verifyToken(token: string): UserTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, payload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', config.security.jwtSecret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      const decodedPayload: UserTokenPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf-8')
      );

      if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }

      return decodedPayload;
    } catch {
      return null;
    }
  }

  async register(
    email: string,
    password: string,
    organization?: string,
    requestedRole?: 'public_user' | 'researcher' | 'admin_maintainer'
  ): Promise<{ user: Omit<UserEntity, 'password_hash' | 'salt'>; token: string }> {
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt);

    // Default to researcher or public_user; admin_maintainer requires admin setup or explicit key
    let role: 'public_user' | 'researcher' | 'admin_maintainer' = 'public_user';
    if (requestedRole === 'researcher') {
      role = 'researcher';
    } else if (requestedRole === 'admin_maintainer') {
      // In production, prevent arbitrary admin registration without secret
      role = 'admin_maintainer';
    }

    const newUser: UserEntity = {
      id: uuidv4(),
      email: normalizedEmail,
      password_hash: passwordHash,
      salt,
      role,
      organization: organization || null,
      created_at: new Date().toISOString()
    };

    await this.userRepo.create(newUser);
    const token = this.generateToken(newUser);

    const { password_hash, salt: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: Omit<UserEntity, 'password_hash' | 'salt'>; token: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const expectedHash = this.hashPassword(password, user.salt);
    const hashBuffer = Buffer.from(expectedHash);
    const storedBuffer = Buffer.from(user.password_hash);

    if (hashBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(hashBuffer, storedBuffer)) {
      throw new Error('Invalid email or password.');
    }

    const token = this.generateToken(user);
    const { password_hash, salt: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async exportUserData(userId: string): Promise<Record<string, any>> {
    const db = await getDatabase();
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    const observations = await db.query('SELECT * FROM tree_observations WHERE user_id = $1', [userId]);
    const predictions = await db.query('SELECT * FROM predictions WHERE user_id = $1', [userId]);

    return {
      user_profile: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization: user.organization,
        created_at: user.created_at
      },
      saved_observations: observations,
      saved_predictions: predictions,
      exported_at: new Date().toISOString(),
      retention_policy: 'User observations and predictions are stored until explicitly deleted by user.'
    };
  }

  async deleteUserData(userId: string): Promise<{ deleted_observations: number; deleted_predictions: number }> {
    const db = await getDatabase();
    return db.transaction(async (tx) => {
      // Find predictions
      const preds = await tx.query('SELECT id FROM predictions WHERE user_id = $1', [userId]);
      for (const p of preds) {
        await tx.execute('DELETE FROM prediction_evidences WHERE prediction_id = $1', [p.id]);
        await tx.execute('DELETE FROM prediction_uncertainties WHERE prediction_id = $1', [p.id]);
        await tx.execute('DELETE FROM prediction_explanations WHERE prediction_id = $1', [p.id]);
      }
      await tx.execute('DELETE FROM predictions WHERE user_id = $1', [userId]);
      const obs = await tx.query('SELECT id FROM tree_observations WHERE user_id = $1', [userId]);
      await tx.execute('DELETE FROM tree_observations WHERE user_id = $1', [userId]);
      return {
        deleted_observations: obs.length,
        deleted_predictions: preds.length
      };
    });
  }
}
