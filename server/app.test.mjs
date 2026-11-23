import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { createApp } from './app.mjs';

test('雪约服务端完成登录、发布、回价、原子锁座和通知闭环', async (t) => {
  const { server } = createApp({
    databasePath: ':memory:',
    authSecret: 'test-secret',
    smsProvider: 'development',
    devCode: '246810',
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await request(baseUrl, 'GET', '/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);

  const owner = await login(baseUrl, '13800000001');
  const passengerOne = await login(baseUrl, '13800000002');
  const passengerTwo = await login(baseUrl, '13800000003');

  const unauthorized = await request(baseUrl, 'GET', '/v1/rides');
  assert.equal(unauthorized.status, 401);

  const created = await request(baseUrl, 'POST', '/v1/rides', owner.token, {
    origin: '长春 · 世纪广场',
    destination: '松花湖雪场',
    dateLabel: '12月13日 · 周六',
    startTime: '07:00',
    minPrice: 50,
    seatsTotal: 2,
    gearTotal: 1,
    maxDetourMinutes: 15,
    note: '测试顺路拼车',
  });
  assert.equal(created.status, 201);
  const rideId = created.body.ride.id;
  assert.equal(created.body.ride.seatsTaken, 1);

  const firstApplication = await request(
    baseUrl,
    'POST',
    `/v1/rides/${rideId}/applications`,
    passengerOne.token,
    {
      people: 1,
      gearCount: 0,
      pickup: '生态大街 · 东师会馆',
      offerPerPerson: 55,
    },
  );
  assert.equal(firstApplication.status, 201);
  const firstApplicationId = firstApplication.body.application.id;

  const secondApplication = await request(
    baseUrl,
    'POST',
    `/v1/rides/${rideId}/applications`,
    passengerTwo.token,
    {
      people: 1,
      gearCount: 0,
      pickup: '南湖大路 · 地铁站',
      offerPerPerson: 52,
    },
  );
  assert.equal(secondApplication.status, 201);
  const secondApplicationId = secondApplication.body.application.id;

  const accepted = await request(
    baseUrl,
    'POST',
    `/v1/applications/${firstApplicationId}/accept`,
    owner.token,
  );
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.application.status, 'accepted');

  const rideAfterAccept = await request(baseUrl, 'GET', `/v1/rides/${rideId}`, owner.token);
  assert.equal(rideAfterAccept.body.ride.status, 'full');
  assert.equal(rideAfterAccept.body.ride.seatsTaken, 2);
  assert.equal(rideAfterAccept.body.ride.routeVersion, 2);

  const conflictingAccept = await request(
    baseUrl,
    'POST',
    `/v1/applications/${secondApplicationId}/accept`,
    owner.token,
  );
  assert.equal(conflictingAccept.status, 409);
  assert.ok(['seat_conflict', 'application_processed'].includes(conflictingAccept.body.error.code));

  const applicationsAfterAccept = await request(
    baseUrl,
    'GET',
    '/v1/applications',
    passengerTwo.token,
  );
  assert.equal(
    applicationsAfterAccept.body.applications.find(
      (application) => application.id === secondApplicationId,
    ).status,
    'expired',
  );

  const secondPassengerNotifications = await request(
    baseUrl,
    'GET',
    '/v1/notifications',
    passengerTwo.token,
  );
  assert.ok(
    secondPassengerNotifications.body.notifications.some(
      (notification) =>
        notification.type === 'seat_full' &&
        notification.applicationId === secondApplicationId,
    ),
  );

  const profileUpdate = await request(baseUrl, 'PATCH', '/v1/me', passengerOne.token, {
    name: '小满',
    vehicleModel: 'Model Y',
    vehicleColor: '白色',
    plateNumber: '吉A12345',
  });
  assert.equal(profileUpdate.status, 200);
  assert.equal(profileUpdate.body.user.name, '小满');
  assert.equal(profileUpdate.body.user.vehicleModel, 'Model Y');

  const me = await request(baseUrl, 'GET', '/v1/me', passengerOne.token);
  assert.equal(me.body.user.phone, '13800000002');
  assert.equal(me.body.user.phoneVerified, true);

  const ownerNotifications = await request(
    baseUrl,
    'GET',
    '/v1/notifications',
    owner.token,
  );
  assert.ok(
    ownerNotifications.body.notifications.some(
      (notification) => notification.type === 'application_received',
    ),
  );
  assert.ok(
    ownerNotifications.body.notifications.some(
      (notification) => notification.type === 'seat_full',
    ),
  );
});

test('一轮回价只能由申请人接受', async (t) => {
  const { server } = createApp({
    databasePath: ':memory:',
    authSecret: 'test-secret',
    smsProvider: 'development',
    devCode: '246810',
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const owner = await login(baseUrl, '13900000001');
  const passenger = await login(baseUrl, '13900000002');

  const ride = await request(baseUrl, 'POST', '/v1/rides', owner.token, {
    origin: '长春 · 卫星广场',
    destination: '北大湖雪场',
    dateLabel: '12月20日 · 周六',
    startTime: '06:40',
    minPrice: 60,
    seatsTotal: 3,
    gearTotal: 2,
    note: '',
  });
  const rideId = ride.body.ride.id;
  const application = await request(
    baseUrl,
    'POST',
    `/v1/rides/${rideId}/applications`,
    passenger.token,
    {
      people: 2,
      gearCount: 1,
      pickup: '卫星广场 · 东南角',
      offerPerPerson: 55,
    },
  );
  const applicationId = application.body.application.id;

  const countered = await request(
    baseUrl,
    'POST',
    `/v1/applications/${applicationId}/counter`,
    owner.token,
    { counterPerPerson: 58 },
  );
  assert.equal(countered.status, 200);
  assert.equal(countered.body.application.status, 'countered');

  const ownerCannotAcceptOwnCounter = await request(
    baseUrl,
    'POST',
    `/v1/applications/${applicationId}/accept`,
    owner.token,
  );
  assert.equal(ownerCannotAcceptOwnCounter.status, 409);

  const acceptedCounter = await request(
    baseUrl,
    'POST',
    `/v1/applications/${applicationId}/accept-counter`,
    passenger.token,
  );
  assert.equal(acceptedCounter.status, 200);
  assert.equal(acceptedCounter.body.application.status, 'accepted');
});

async function login(baseUrl, phone) {
  const challenge = await request(baseUrl, 'POST', '/v1/auth/request-code', undefined, {
    phone,
  });
  assert.equal(challenge.status, 201);
  assert.equal(challenge.body.devCode, '246810');

  const verified = await request(baseUrl, 'POST', '/v1/auth/verify-code', undefined, {
    phone,
    challengeId: challenge.body.challengeId,
    code: challenge.body.devCode,
  });
  assert.equal(verified.status, 200);
  assert.ok(verified.body.token);
  return verified.body;
}

async function request(baseUrl, method, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const parsed = await response.json();
  return { status: response.status, body: parsed };
}
