import { getDatabase } from '../database/connection';

export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: 'public_user' | 'researcher' | 'admin_maintainer';
  organization?: string | null;
  created_at: string;
  updated_at?: string;
}

export class UserRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    const db = await getDatabase();
    const rows = await db.query<UserEntity>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const db = await getDatabase();
    const rows = await db.query<UserEntity>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, organization, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        user.email.toLowerCase().trim(),
        user.password_hash,
        user.salt,
        user.role,
        user.organization || null,
        user.created_at || new Date().toISOString(),
        user.updated_at || new Date().toISOString()
      ]
    );
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    await db.execute('DELETE FROM users WHERE id = $1', [id]);
    return true;
  }
}
