import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SESSION_DAYS = 30;
const CODE_MINUTES = 5;
const MAX_CODE_ATTEMPTS = 5;
const MAX_BODY_BYTES = 1_000_000;
const USER_COLORS = ['#E7B094', '#A9DCCC', '#B9D5EA', '#D9C0AD', '#C8C2F2'];

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createApp({
  databasePath = ':memory:',
  authSecret = process.env.AUTH_SECRET || 'xueyue-development-secret',
  smsProvider = process.env.SMS_PROVIDER || 'development',
  devCode = process.env.DEV_AUTH_CODE || '246810',
  corsOrigin = process.env.CORS_ORIGIN || '*',
} = {}) {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  initializeSchema(db);

  const app = async function handleRequest(req, res) {
    setCors(req, res, corsOrigin);
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      await routeRequest({ req, res, db, authSecret, smsProvider, devCode });
    } catch (error) {
      if (res.headersSent) return;
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : 'internal_error';
      const message =
        error instanceof HttpError ? error.message : '服务暂时不可用，请稍后再试。';
      if (!(error instanceof HttpError)) {
        console.error(error);
      }
      sendJson(res, status, { error: { code, message } });
    }
  };

  const server = createServer(app);
  server.on('close', () => db.close());
  return { server, db };
}

function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      initial TEXT NOT NULL,
      color TEXT NOT NULL,
      vehicle_model TEXT NOT NULL DEFAULT '',
      vehicle_color TEXT NOT NULL DEFAULT '',
      plate_number TEXT NOT NULL DEFAULT '',
      phone_verified INTEGER NOT NULL DEFAULT 1,
      rides_together INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_challenges (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rides (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      date_label TEXT NOT NULL,
      start_time TEXT NOT NULL,
      eta TEXT NOT NULL DEFAULT '待计算',
      distance_km REAL NOT NULL DEFAULT 0,
      duration_min INTEGER NOT NULL DEFAULT 0,
      has_route_sample INTEGER NOT NULL DEFAULT 0,
      min_price REAL NOT NULL,
      suggested_price REAL NOT NULL,
      seats_total INTEGER NOT NULL,
      seats_taken INTEGER NOT NULL DEFAULT 1,
      gear_total INTEGER NOT NULL,
      gear_used INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'recruiting',
      route_version INTEGER NOT NULL DEFAULT 1,
      max_detour_minutes INTEGER NOT NULL DEFAULT 15,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ride_stops (
      id TEXT PRIMARY KEY,
      ride_id TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      kind TEXT NOT NULL,
      time TEXT NOT NULL,
      exact_visible INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      ride_id TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
      applicant_id TEXT NOT NULL REFERENCES users(id),
      people INTEGER NOT NULL,
      gear_count INTEGER NOT NULL,
      pickup TEXT NOT NULL,
      offer_per_person REAL NOT NULL,
      counter_per_person REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      added_minutes INTEGER NOT NULL DEFAULT 0,
      new_distance_km REAL NOT NULL DEFAULT 0,
      new_duration_min INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      ride_id TEXT,
      application_id TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rides_status_date ON rides(status, date_label);
    CREATE INDEX IF NOT EXISTS idx_applications_ride_status ON applications(ride_id, status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
      ON notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);
  `);
}

async function routeRequest({ req, res, db, authSecret, smsProvider, devCode }) {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;
  const parts = path.split('/').filter(Boolean);
  const method = req.method || 'GET';

  if (method === 'GET' && path === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'xueyue-api',
      time: nowIso(),
    });
    return;
  }

  if (method === 'POST' && path === '/v1/auth/request-code') {
    const body = await readJson(req);
    if (smsProvider !== 'development') {
      throw new HttpError(
        503,
        'sms_provider_not_configured',
        '生产短信服务尚未配置，开发服务不会返回假验证码。',
      );
    }
    const phone = requirePhone(body.phone);
    const challenge = createChallenge(db, phone, authSecret, devCode);
    sendJson(res, 201, {
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      delivery: 'development',
      ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
    });
    return;
  }

  if (method === 'POST' && path === '/v1/auth/verify-code') {
    const body = await readJson(req);
    const phone = requirePhone(body.phone);
    const challengeId = requireString(body.challengeId, 'challengeId', 100);
    const code = requireString(body.code, 'code', 12);
    const session = verifyChallenge(db, { phone, challengeId, code, authSecret });
    sendJson(res, 200, session);
    return;
  }

  if (method === 'GET' && path === '/v1/me') {
    const user = authenticate(db, req, authSecret);
    sendJson(res, 200, { user: serializeUser(user, true) });
    return;
  }

  if (method === 'PATCH' && path === '/v1/me') {
    const user = authenticate(db, req, authSecret);
    const body = await readJson(req);
    const name = optionalString(body.name, 'name', 1, 24);
    const vehicleModel = optionalString(body.vehicleModel, 'vehicleModel', 0, 60);
    const vehicleColor = optionalString(body.vehicleColor, 'vehicleColor', 0, 30);
    const plateNumber = optionalString(body.plateNumber, 'plateNumber', 0, 16);

    if ([name, vehicleModel, vehicleColor, plateNumber].every((value) => value === undefined)) {
      throw new HttpError(400, 'empty_update', '至少提交一项要修改的资料。');
    }

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          initial = COALESCE(?, initial),
          vehicle_model = COALESCE(?, vehicle_model),
          vehicle_color = COALESCE(?, vehicle_color),
          plate_number = COALESCE(?, plate_number),
          updated_at = ?
      WHERE id = ?
    `).run(
      name ?? null,
      name ? firstCharacter(name) : null,
      vehicleModel ?? null,
      vehicleColor ?? null,
      plateNumber ?? null,
      nowIso(),
      user.id,
    );
    const updated = findUser(db, user.id);
    sendJson(res, 200, { user: serializeUser(updated, true) });
    return;
  }

  if (method === 'GET' && path === '/v1/rides') {
    authenticate(db, req, authSecret);
    const destination = url.searchParams.get('destination')?.trim();
    const dateLabel = url.searchParams.get('date')?.trim();
    const status = url.searchParams.get('status')?.trim() || 'recruiting';
    const clauses = ['r.status = ?'];
    const values = [status];
    if (destination) {
      clauses.push('r.destination LIKE ?');
      values.push(`%${destination}%`);
    }
    if (dateLabel) {
      clauses.push('r.date_label = ?');
      values.push(dateLabel);
    }
    const rows = db
      .prepare(`SELECT r.* FROM rides r WHERE ${clauses.join(' AND ')} ORDER BY r.created_at DESC`)
      .all(...values);
    sendJson(res, 200, { rides: rows.map((row) => serializeRide(db, row)) });
    return;
  }

  if (method === 'POST' && path === '/v1/rides') {
    const user = authenticate(db, req, authSecret);
    const body = await readJson(req);
    const ride = createRide(db, user, body);
    sendJson(res, 201, { ride });
    return;
  }

  if (parts[0] === 'v1' && parts[1] === 'rides' && parts[2] && method === 'GET') {
    authenticate(db, req, authSecret);
    const row = db.prepare('SELECT * FROM rides WHERE id = ?').get(parts[2]);
    if (!row) throw new HttpError(404, 'ride_not_found', '这段拼车不存在。');
    sendJson(res, 200, { ride: serializeRide(db, row) });
    return;
  }

  if (
    parts[0] === 'v1' &&
    parts[1] === 'rides' &&
    parts[2] &&
    parts[3] === 'applications' &&
    method === 'POST'
  ) {
    const user = authenticate(db, req, authSecret);
    const body = await readJson(req);
    const application = createApplication(db, user, parts[2], body);
    sendJson(res, 201, { application });
    return;
  }

  if (method === 'GET' && path === '/v1/applications') {
    const user = authenticate(db, req, authSecret);
    const rows = db
      .prepare(`
        SELECT a.*, r.owner_id
        FROM applications a
        JOIN rides r ON r.id = a.ride_id
        WHERE a.applicant_id = ? OR r.owner_id = ?
        ORDER BY a.created_at DESC
      `)
      .all(user.id, user.id);
    sendJson(res, 200, {
      applications: rows.map((row) => serializeApplication(db, row)),
    });
    return;
  }

  if (parts[0] === 'v1' && parts[1] === 'applications' && parts[2] && method === 'POST') {
    const user = authenticate(db, req, authSecret);
    const action = parts[3];
    if (action === 'accept' || action === 'accept-counter') {
      const application = acceptApplication(db, {
        applicationId: parts[2],
        actorId: user.id,
        mode: action,
      });
      sendJson(res, 200, { application });
      return;
    }
    if (action === 'reject') {
      const application = rejectApplication(db, parts[2], user.id);
      sendJson(res, 200, { application });
      return;
    }
    if (action === 'counter') {
      const body = await readJson(req);
      const application = counterApplication(
        db,
        parts[2],
        user.id,
        requireNonNegativeNumber(body.counterPerPerson, 'counterPerPerson'),
      );
      sendJson(res, 200, { application });
      return;
    }
    if (action === 'withdraw') {
      const application = withdrawApplication(db, parts[2], user.id);
      sendJson(res, 200, { application });
      return;
    }
  }

  if (method === 'GET' && path === '/v1/notifications') {
    const user = authenticate(db, req, authSecret);
    const rows = db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC')
      .all(user.id);
    sendJson(res, 200, { notifications: rows.map(serializeNotification) });
    return;
  }

  if (method === 'PATCH' && path === '/v1/notifications/read-all') {
    const user = authenticate(db, req, authSecret);
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(user.id);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (
    parts[0] === 'v1' &&
    parts[1] === 'notifications' &&
    parts[2] &&
    parts[3] === 'read' &&
    method === 'PATCH'
  ) {
    const user = authenticate(db, req, authSecret);
    const result = db
      .prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
      .run(parts[2], user.id);
    if (Number(result.changes) === 0) {
      throw new HttpError(404, 'notification_not_found', '通知不存在。');
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  throw new HttpError(404, 'not_found', '接口不存在。');
}

function createChallenge(db, phone, authSecret, developmentCode) {
  const id = `challenge-${randomUUID()}`;
  const code = developmentCode || String(randomInt(100000, 1000000));
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000).toISOString();
  db.prepare(`
    INSERT INTO auth_challenges (id, phone, code_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, phone, hashCode(code, id, authSecret), expiresAt, createdAt);
  return { id, expiresAt, devCode: developmentCode ? code : undefined };
}

function verifyChallenge(db, { phone, challengeId, code, authSecret }) {
  const challenge = db
    .prepare('SELECT * FROM auth_challenges WHERE id = ? AND phone = ?')
    .get(challengeId, phone);
  if (!challenge || challenge.consumed_at) {
    throw new HttpError(400, 'challenge_invalid', '验证码已失效，请重新获取。');
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    throw new HttpError(400, 'challenge_expired', '验证码已过期，请重新获取。');
  }
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
    throw new HttpError(429, 'too_many_attempts', '尝试次数过多，请重新获取验证码。');
  }

  const expected = Buffer.from(challenge.code_hash, 'hex');
  const actual = Buffer.from(hashCode(code, challengeId, authSecret), 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    db.prepare('UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?').run(challengeId);
    throw new HttpError(401, 'code_incorrect', '验证码不正确。');
  }

  const now = nowIso();
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    const name = `雪友${phone.slice(-4)}`;
    const id = `user-${randomUUID()}`;
    db.prepare(`
      INSERT INTO users
        (id, phone, name, initial, color, phone_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      phone,
      name,
      firstCharacter(name),
      USER_COLORS[Number(phone.at(-1)) % USER_COLORS.length],
      now,
      now,
    );
    user = findUser(db, id);
  } else {
    db.prepare('UPDATE users SET phone_verified = 1, updated_at = ? WHERE id = ?').run(now, user.id);
    user = findUser(db, user.id);
  }

  db.prepare('UPDATE auth_challenges SET consumed_at = ? WHERE id = ?').run(now, challengeId);
  const session = createSession(db, user.id, authSecret);
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: serializeUser(user, true),
  };
}

function createSession(db, userId, authSecret) {
  const id = `session-${randomUUID()}`;
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  const createdAt = nowIso();
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, hashToken(token, authSecret), expiresAt, createdAt);
  return { token, expiresAt };
}

function authenticate(db, req, authSecret) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'authentication_required', '请先完成登录。');
  }
  const token = authorization.slice(7).trim();
  if (!token) throw new HttpError(401, 'authentication_required', '请先完成登录。');

  const row = db
    .prepare(`
      SELECT u.*, s.expires_at AS session_expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL
    `)
    .get(hashToken(token, authSecret));
  if (!row || new Date(row.session_expires_at).getTime() < Date.now()) {
    throw new HttpError(401, 'session_expired', '登录已过期，请重新验证手机号。');
  }
  return row;
}

function createRide(db, owner, body) {
  const origin = requireString(body.origin, 'origin', 200);
  const destination = requireString(body.destination, 'destination', 120);
  const dateLabel = requireString(body.dateLabel, 'dateLabel', 60);
  const startTime = requireString(body.startTime, 'startTime', 5);
  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    throw new HttpError(400, 'invalid_start_time', '出发时间格式应为 07:00。');
  }
  const minPrice = requireNonNegativeNumber(body.minPrice, 'minPrice');
  const suggestedPrice =
    body.suggestedPrice === undefined
      ? minPrice
      : requireNonNegativeNumber(body.suggestedPrice, 'suggestedPrice');
  const seatsTotal = requireInteger(body.seatsTotal, 'seatsTotal', 2, 8);
  const gearTotal = requireInteger(body.gearTotal, 'gearTotal', 0, 12);
  const maxDetourMinutes = requireInteger(body.maxDetourMinutes ?? 15, 'maxDetourMinutes', 0, 180);
  const note = optionalString(body.note, 'note', 0, 500) ?? '';
  const now = nowIso();
  const id = `ride-${randomUUID()}`;

  transaction(db, () => {
    db.prepare(`
      INSERT INTO rides (
        id, owner_id, origin, destination, date_label, start_time, min_price,
        suggested_price, seats_total, gear_total, max_detour_minutes, note,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      owner.id,
      origin,
      destination,
      dateLabel,
      startTime,
      minPrice,
      suggestedPrice,
      seatsTotal,
      gearTotal,
      maxDetourMinutes,
      note,
      now,
      now,
    );
    const originParts = origin.split(' · ');
    insertStop(db, {
      rideId: id,
      name: originParts.at(-1) || origin,
      area: originParts[0] || '出发地',
      kind: 'origin',
      time: startTime,
      exactVisible: 1,
      sortOrder: 0,
    });
    insertStop(db, {
      rideId: id,
      name: destination,
      area: '雪场',
      kind: 'destination',
      time: '待计算',
      exactVisible: 1,
      sortOrder: 100,
    });
  });

  return serializeRide(db, db.prepare('SELECT * FROM rides WHERE id = ?').get(id));
}

function createApplication(db, applicant, rideId, body) {
  const people = requireInteger(body.people, 'people', 1, 8);
  const gearCount = requireInteger(body.gearCount, 'gearCount', 0, 12);
  const pickup = requireString(body.pickup, 'pickup', 240);
  const offerPerPerson = requireNonNegativeNumber(body.offerPerPerson, 'offerPerPerson');
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(rideId);
  if (!ride) throw new HttpError(404, 'ride_not_found', '这段拼车不存在。');
  if (ride.owner_id === applicant.id) {
    throw new HttpError(409, 'owner_cannot_apply', '不能申请自己发布的拼车。');
  }
  if (ride.status !== 'recruiting') {
    throw new HttpError(409, 'ride_not_recruiting', '这段拼车已停止接受申请。');
  }
  if (ride.seats_total - ride.seats_taken < people) {
    throw new HttpError(409, 'seat_conflict', '剩余座位不足。');
  }
  if (ride.gear_total - ride.gear_used < gearCount) {
    throw new HttpError(409, 'gear_conflict', '剩余雪具位不足。');
  }
  const active = db.prepare(`
    SELECT id FROM applications
    WHERE ride_id = ? AND applicant_id = ? AND status IN ('pending', 'countered', 'accepted')
  `).get(rideId, applicant.id);
  if (active) {
    throw new HttpError(409, 'application_exists', '你已经申请过这段拼车。');
  }

  const id = `application-${randomUUID()}`;
  const now = nowIso();
  const addedMinutes = Math.max(0, Math.trunc(Number(body.addedMinutes) || 0));
  const newDistanceKm = Math.max(
    Number(ride.distance_km) || 0,
    Number(body.newDistanceKm) || Number(ride.distance_km) || 0,
  );
  const newDurationMin = Math.max(
    Number(ride.duration_min) || 0,
    Number(body.newDurationMin) || Number(ride.duration_min) || 0,
  );

  transaction(db, () => {
    db.prepare(`
      INSERT INTO applications (
        id, ride_id, applicant_id, people, gear_count, pickup, offer_per_person,
        added_minutes, new_distance_km, new_duration_min, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      rideId,
      applicant.id,
      people,
      gearCount,
      pickup,
      offerPerPerson,
      addedMinutes,
      newDistanceKm,
      newDurationMin,
      now,
      now,
    );
    addNotification(db, {
      userId: ride.owner_id,
      type: 'application_received',
      title: `${applicant.name}申请加入你的拼车`,
      body: `${people} 人同行，${gearCount} 副雪具，报价 ¥${offerPerPerson} / 人。`,
      rideId,
      applicationId: id,
    });
    addNotification(db, {
      userId: applicant.id,
      type: 'application_submitted',
      title: '申请已发出',
      body: `${people} 人、${gearCount} 副雪具，报价 ¥${offerPerPerson} / 人。等待车主查看路线。`,
      rideId,
      applicationId: id,
    });
  });

  return serializeApplication(db, db.prepare('SELECT * FROM applications WHERE id = ?').get(id));
}

function acceptApplication(db, { applicationId, actorId, mode }) {
  let updated;
  transaction(db, () => {
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(applicationId);
    if (!application) {
      throw new HttpError(404, 'application_not_found', '这份申请不存在。');
    }
    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(application.ride_id);
    if (!ride) throw new HttpError(404, 'ride_not_found', '这段拼车不存在。');

    if (mode === 'accept') {
      if (ride.owner_id !== actorId) {
        throw new HttpError(403, 'owner_only', '只有车主可以同意申请。');
      }
      if (application.status !== 'pending') {
        throw new HttpError(409, 'application_processed', '这份申请已经处理过了。');
      }
    } else {
      if (application.applicant_id !== actorId) {
        throw new HttpError(403, 'applicant_only', '只有申请人可以接受回价。');
      }
      if (application.status !== 'countered') {
        throw new HttpError(409, 'counter_not_pending', '这份回价已经处理过了。');
      }
    }

    const remainingSeats = ride.seats_total - ride.seats_taken;
    const remainingGear = ride.gear_total - ride.gear_used;
    if (remainingSeats < application.people) {
      throw new HttpError(409, 'seat_conflict', '剩余座位不足，无法确认同行。');
    }
    if (remainingGear < application.gear_count) {
      throw new HttpError(409, 'gear_conflict', '剩余雪具位不足，无法确认同行。');
    }

    const nextVersion = ride.route_version + 1;
    const nextSeats = ride.seats_taken + application.people;
    const nextStatus = nextSeats >= ride.seats_total ? 'full' : 'recruiting';
    const finalPrice = application.counter_per_person ?? application.offer_per_person;
    const now = nowIso();
    db.prepare(`
      UPDATE rides
      SET seats_taken = ?, gear_used = ?, route_version = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      nextSeats,
      ride.gear_used + application.gear_count,
      nextVersion,
      nextStatus,
      now,
      ride.id,
    );
    db.prepare(`
      UPDATE applications
      SET status = 'accepted', updated_at = ?
      WHERE id = ?
    `).run(now, applicationId);
    insertStop(db, {
      rideId: ride.id,
      name: application.pickup,
      area: '乘客上车点',
      kind: 'pickup',
      time: ride.start_time,
      exactVisible: 0,
      sortOrder: nextVersion,
    });
    addNotification(db, {
      userId: application.applicant_id,
      type: 'application_accepted',
      title: `${findUser(db, ride.owner_id).name}已确认你的同行`,
      body: `${application.people} 个座位已锁定，价格 ¥${finalPrice} / 人，路线更新至第 ${nextVersion} 版。`,
      rideId: ride.id,
      applicationId,
    });
    if (nextStatus === 'full') {
      addNotification(db, {
        userId: ride.owner_id,
        type: 'seat_full',
        title: '你的拼车已满员',
        body: `${ride.destination}拼车座位已经确认完毕，新路线为第 ${nextVersion} 版。`,
        rideId: ride.id,
        applicationId,
      });
      const competing = db.prepare(`
        SELECT * FROM applications
        WHERE ride_id = ? AND id <> ? AND status IN ('pending', 'countered')
      `).all(ride.id, applicationId);
      for (const item of competing) {
        db.prepare(`
          UPDATE applications SET status = 'expired', updated_at = ? WHERE id = ?
        `).run(now, item.id);
        addNotification(db, {
          userId: item.applicant_id,
          type: 'seat_full',
          title: '这段拼车已经满员',
          body: `座位在路线确认时已被其他乘客占满，你的申请未成交，也未占用座位。`,
          rideId: ride.id,
          applicationId: item.id,
        });
      }
    }
    updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  });
  return serializeApplication(db, updated);
}

function rejectApplication(db, applicationId, ownerId) {
  return ownerUpdateApplication(db, applicationId, ownerId, 'rejected');
}

function withdrawApplication(db, applicationId, applicantId) {
  let updated;
  transaction(db, () => {
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(applicationId);
    if (!application) {
      throw new HttpError(404, 'application_not_found', '这份申请不存在。');
    }
    if (application.applicant_id !== applicantId) {
      throw new HttpError(403, 'applicant_only', '只有申请人可以撤回。');
    }
    if (!['pending', 'countered'].includes(application.status)) {
      throw new HttpError(409, 'application_processed', '这份申请已经处理过了。');
    }
    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(application.ride_id);
    db.prepare(`
      UPDATE applications SET status = 'withdrawn', updated_at = ? WHERE id = ?
    `).run(nowIso(), applicationId);
    addNotification(db, {
      userId: ride.owner_id,
      type: 'application_withdrawn',
      title: `${findUser(db, applicantId).name}撤回了申请`,
      body: `${application.people} 人的同行申请已撤回，未占用座位。`,
      rideId: ride.id,
      applicationId,
    });
    updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  });
  return serializeApplication(db, updated);
}

function counterApplication(db, applicationId, ownerId, counterPerPerson) {
  let updated;
  transaction(db, () => {
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(applicationId);
    if (!application) {
      throw new HttpError(404, 'application_not_found', '这份申请不存在。');
    }
    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(application.ride_id);
    if (ride.owner_id !== ownerId) {
      throw new HttpError(403, 'owner_only', '只有车主可以回价。');
    }
    if (application.status !== 'pending') {
      throw new HttpError(409, 'application_processed', '这份申请已经处理过了。');
    }
    db.prepare(`
      UPDATE applications
      SET status = 'countered', counter_per_person = ?, updated_at = ?
      WHERE id = ?
    `).run(counterPerPerson, nowIso(), applicationId);
    addNotification(db, {
      userId: application.applicant_id,
      type: 'counter_offer',
      title: `${findUser(db, ownerId).name}回复了你的报价`,
      body: `回价 ¥${counterPerPerson} / 人，${application.people} 人共 ¥${counterPerPerson * application.people}。`,
      rideId: ride.id,
      applicationId,
    });
    updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  });
  return serializeApplication(db, updated);
}

function ownerUpdateApplication(db, applicationId, ownerId, status) {
  let updated;
  transaction(db, () => {
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(applicationId);
    if (!application) {
      throw new HttpError(404, 'application_not_found', '这份申请不存在。');
    }
    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(application.ride_id);
    if (ride.owner_id !== ownerId) {
      throw new HttpError(403, 'owner_only', '只有车主可以处理这份申请。');
    }
    if (!['pending', 'countered'].includes(application.status)) {
      throw new HttpError(409, 'application_processed', '这份申请已经处理过了。');
    }
    db.prepare('UPDATE applications SET status = ?, updated_at = ? WHERE id = ?').run(
      status,
      nowIso(),
      applicationId,
    );
    addNotification(db, {
      userId: application.applicant_id,
      type: 'application_rejected',
      title: `${findUser(db, ownerId).name}暂未接受这次同行`,
      body: `去${ride.destination}的申请未成交，座位和路线没有变化。`,
      rideId: ride.id,
      applicationId,
    });
    updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  });
  return serializeApplication(db, updated);
}

function insertStop(db, stop) {
  db.prepare(`
    INSERT INTO ride_stops
      (id, ride_id, name, area, kind, time, exact_visible, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `stop-${randomUUID()}`,
    stop.rideId,
    stop.name,
    stop.area,
    stop.kind,
    stop.time,
    stop.exactVisible,
    stop.sortOrder,
  );
}

function addNotification(db, notification) {
  db.prepare(`
    INSERT INTO notifications
      (id, user_id, type, title, body, ride_id, application_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `notification-${randomUUID()}`,
    notification.userId,
    notification.type,
    notification.title,
    notification.body,
    notification.rideId ?? null,
    notification.applicationId ?? null,
    nowIso(),
  );
}

function serializeRide(db, row) {
  const owner = findUser(db, row.owner_id);
  const stops = db
    .prepare('SELECT * FROM ride_stops WHERE ride_id = ? ORDER BY sort_order, id')
    .all(row.id);
  return {
    id: row.id,
    owner: serializeUser(owner),
    origin: row.origin,
    destination: row.destination,
    dateLabel: row.date_label,
    startTime: row.start_time,
    eta: row.eta,
    distanceKm: Number(row.distance_km),
    durationMin: Number(row.duration_min),
    hasRouteSample: Boolean(row.has_route_sample),
    minPrice: Number(row.min_price),
    suggestedPrice: Number(row.suggested_price),
    seatsTotal: Number(row.seats_total),
    seatsTaken: Number(row.seats_taken),
    gearTotal: Number(row.gear_total),
    gearUsed: Number(row.gear_used),
    status: row.status,
    routeVersion: Number(row.route_version),
    stops: stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      area: stop.area,
      kind: stop.kind,
      time: stop.time,
      exactVisible: Boolean(stop.exact_visible),
    })),
    rules: [`最多绕行 ${row.max_detour_minutes} 分钟`],
    note: row.note,
    createdAt: row.created_at,
  };
}

function serializeApplication(db, row) {
  return {
    id: row.id,
    rideId: row.ride_id,
    applicant: serializeUser(findUser(db, row.applicant_id)),
    people: Number(row.people),
    gearCount: Number(row.gear_count),
    pickup: row.pickup,
    offerPerPerson: Number(row.offer_per_person),
    ...(row.counter_per_person === null
      ? {}
      : { counterPerPerson: Number(row.counter_per_person) }),
    status: row.status,
    addedMinutes: Number(row.added_minutes),
    newDistanceKm: Number(row.new_distance_km),
    newDurationMin: Number(row.new_duration_min),
    createdAt: row.created_at,
  };
}

function serializeUser(row, includePhone = false) {
  return {
    id: row.id,
    ...(includePhone ? { phone: row.phone } : {}),
    name: row.name,
    initial: row.initial,
    color: row.color,
    phoneVerified: Boolean(row.phone_verified),
    ridesTogether: Number(row.rides_together),
    vehicleModel: row.vehicle_model,
    vehicleColor: row.vehicle_color,
    plateNumber: row.plate_number,
  };
}

function serializeNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    rideId: row.ride_id ?? undefined,
    applicationId: row.application_id ?? undefined,
    createdAt: row.created_at,
    read: Boolean(row.read),
  };
}

function findUser(db, userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new HttpError(404, 'user_not_found', '用户不存在。');
  return user;
}

function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'body_too_large', '请求内容过大。');
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed;
  } catch {
    throw new HttpError(400, 'invalid_json', '请求内容不是有效 JSON。');
  }
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function setCors(req, res, origin) {
  const allowedOrigins = origin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin;
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
}

function requirePhone(value) {
  const phone = requireString(value, 'phone', 11);
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw new HttpError(400, 'invalid_phone', '请输入有效的 11 位中国大陆手机号。');
  }
  return phone;
}

function requireString(value, field, maxLength) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'invalid_field', `${field} 必须是文本。`);
  }
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) {
    throw new HttpError(400, 'invalid_field', `${field} 长度不正确。`);
  }
  return cleaned;
}

function optionalString(value, field, minLength, maxLength) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new HttpError(400, 'invalid_field', `${field} 必须是文本。`);
  }
  const cleaned = value.trim();
  if (cleaned.length < minLength || cleaned.length > maxLength) {
    throw new HttpError(400, 'invalid_field', `${field} 长度不正确。`);
  }
  return cleaned;
}

function requireInteger(value, field, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, 'invalid_field', `${field} 必须是 ${min} 到 ${max} 的整数。`);
  }
  return value;
}

function requireNonNegativeNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new HttpError(400, 'invalid_field', `${field} 必须是不小于 0 的数字。`);
  }
  return value;
}

function hashCode(code, challengeId, secret) {
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
}

function hashToken(token, secret) {
  return createHmac('sha256', secret).update(token).digest('hex');
}

function firstCharacter(value) {
  return Array.from(value.trim())[0] || '雪';
}

function nowIso() {
  return new Date().toISOString();
}
