import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  currentUser as defaultCurrentUser,
  defaultDestinations,
  defaultOrigins,
  pickupOptions,
  seedApplications,
  seedNotifications,
  seedRides,
} from '@/data/trips';
import type {
  Application,
  AppNotification,
  CompleteOnboardingInput,
  CreateApplicationInput,
  CreateRideInput,
  LocalAccount,
  NotificationType,
  Ride,
  UpdateAccountInput,
  User,
} from '@/types';

const STORAGE_KEY = '@xueyue/carpool/v6';

const seedLocations = Array.from(
  new Set([...defaultOrigins, ...defaultDestinations, ...pickupOptions]),
);

type AppData = {
  rides: Ride[];
  applications: Application[];
  notifications: AppNotification[];
  savedLocations: string[];
  account: LocalAccount;
};

type OperationResult = {
  ok: boolean;
  message?: string;
};

type AppContextValue = AppData & {
  hydrated: boolean;
  currentUser: User;
  completeOnboarding: (input: CompleteOnboardingInput) => void;
  updateAccount: (input: UpdateAccountInput) => void;
  addRide: (input: CreateRideInput) => Ride;
  submitApplication: (input: CreateApplicationInput) => Application;
  acceptApplication: (applicationId: string) => OperationResult;
  rejectApplication: (applicationId: string) => void;
  counterApplication: (applicationId: string, perPersonPrice: number) => void;
  acceptCounterOffer: (applicationId: string) => OperationResult;
  declineCounterOffer: (applicationId: string) => void;
  withdrawApplication: (applicationId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  rememberLocation: (location: string) => void;
  resetDemo: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const defaultAccount: LocalAccount = {
  name: defaultCurrentUser.name,
  phone: '',
  vehicleModel: '',
  vehicleColor: '',
  plateNumber: '',
  onboardingCompleted: false,
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  rideId?: string;
  applicationId?: string;
}): AppNotification {
  return {
    ...input,
    id: makeId('notification'),
    createdAt: new Date().toISOString(),
    read: false,
  };
}

function remainingSeats(ride: Ride) {
  return Math.max(0, ride.seatsTotal - ride.seatsTaken);
}

function remainingGear(ride: Ride) {
  return Math.max(0, ride.gearTotal - ride.gearUsed);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    rides: seedRides,
    applications: seedApplications,
    notifications: seedNotifications,
    savedLocations: seedLocations,
    account: defaultAccount,
  });
  const [hydrated, setHydrated] = useState(false);
  const hasHydrated = useRef(false);
  const currentUser = useMemo<User>(() => {
    const name = data.account.name.trim() || defaultCurrentUser.name;
    return {
      ...defaultCurrentUser,
      name,
      initial: Array.from(name)[0] ?? defaultCurrentUser.initial,
      // SMS verification is connected with the production authentication service later.
      phoneVerified: false,
    };
  }, [data.account.name]);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active || !value) return;
        const parsed = JSON.parse(value) as Partial<AppData>;
        if (Array.isArray(parsed.rides) && Array.isArray(parsed.applications)) {
          setData({
            rides: parsed.rides,
            applications: parsed.applications,
            notifications: Array.isArray(parsed.notifications)
              ? parsed.notifications
              : seedNotifications,
            savedLocations: Array.isArray(parsed.savedLocations)
              ? parsed.savedLocations
              : seedLocations,
            account:
              parsed.account && typeof parsed.account === 'object'
                ? { ...defaultAccount, ...parsed.account }
                : defaultAccount,
          });
        }
      })
      .catch(() => {
        // Local data must never block the app from opening.
      })
      .finally(() => {
        if (!active) return;
        hasHydrated.current = true;
        setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {
      // Keep the in-memory experience usable if persistence fails.
    });
  }, [data]);

  const completeOnboarding = useCallback((input: CompleteOnboardingInput) => {
    const name = input.name.trim();
    const phone = input.phone.trim();
    const nextUser: User = {
      ...currentUser,
      name,
      initial: Array.from(name)[0] ?? defaultCurrentUser.initial,
    };

    setData((current) => ({
      ...current,
      account: {
        ...current.account,
        name,
        phone,
        onboardingCompleted: true,
        privacyAcceptedAt: new Date().toISOString(),
      },
      rides: current.rides.map((ride) =>
        ride.owner.id === currentUser.id ? { ...ride, owner: nextUser } : ride,
      ),
      applications: current.applications.map((application) =>
        application.applicant.id === currentUser.id
          ? { ...application, applicant: nextUser }
          : application,
      ),
    }));
  }, [currentUser]);

  const updateAccount = useCallback((input: UpdateAccountInput) => {
    setData((current) => {
      const name = input.name?.trim() || current.account.name || defaultCurrentUser.name;
      const nextUser: User = {
        ...currentUser,
        name,
        initial: Array.from(name)[0] ?? defaultCurrentUser.initial,
      };
      return {
        ...current,
        account: {
          ...current.account,
          ...input,
          name,
        },
        rides: current.rides.map((ride) =>
          ride.owner.id === currentUser.id ? { ...ride, owner: nextUser } : ride,
        ),
        applications: current.applications.map((application) =>
          application.applicant.id === currentUser.id
            ? { ...application, applicant: nextUser }
            : application,
        ),
      };
    });
  }, [currentUser]);

  const addRide = useCallback((input: CreateRideInput) => {
    const id = makeId('ride');
    const ride: Ride = {
      id,
      owner: currentUser,
      origin: input.origin,
      destination: input.destination,
      dateLabel: input.dateLabel,
      startTime: input.startTime,
      eta: '待计算',
      distanceKm: 0,
      durationMin: 0,
      hasRouteSample: false,
      minPrice: input.minPrice,
      suggestedPrice: Math.max(input.minPrice, 55),
      seatsTotal: input.seatsTotal,
      seatsTaken: 1,
      gearTotal: input.gearTotal,
      gearUsed: 0,
      status: 'recruiting',
      routeVersion: 1,
      stops: [
        {
          id: `${id}-origin`,
          name: input.origin.split(' · ').at(-1) ?? input.origin,
          area: input.origin.split(' · ')[0] ?? '长春',
          kind: 'origin',
          time: input.startTime,
          exactVisible: true,
        },
        {
          id: `${id}-end`,
          name: input.destination,
          area: '雪场',
          kind: 'destination',
          time: '待计算',
          exactVisible: true,
        },
      ],
      rules: [`最多绕行 ${input.maxDetourMinutes} 分钟`],
      note: input.note.trim() || '先约上人，路线和集合细节再一起确认。',
      createdAt: new Date().toISOString(),
    };

    setData((current) => ({ ...current, rides: [ride, ...current.rides] }));
    return ride;
  }, [currentUser]);

  const submitApplication = useCallback((input: CreateApplicationInput) => {
    const ride = data.rides.find((item) => item.id === input.rideId);
    const application: Application = {
      id: makeId('application'),
      rideId: input.rideId,
      applicant: currentUser,
      people: input.people,
      gearCount: input.gearCount,
      pickup: input.pickup,
      offerPerPerson: input.offerPerPerson,
      status: 'pending',
      addedMinutes: 8,
      newDistanceKm: 140,
      newDurationMin: 105,
      createdAt: new Date().toISOString(),
    };
    const submittedNotification = makeNotification({
      userId: currentUser.id,
      type: 'application_submitted',
      title: '申请已发出',
      body: `${input.people} 人、${input.gearCount} 副雪具，报价 ¥${input.offerPerPerson} / 人。等待车主查看路线。`,
      rideId: input.rideId,
      applicationId: application.id,
    });
    const ownerNotification = ride
      ? makeNotification({
          userId: ride.owner.id,
          type: 'application_received',
          title: `${currentUser.name}申请加入你的拼车`,
          body: `${input.people} 人同行，${input.gearCount} 副雪具，报价 ¥${input.offerPerPerson} / 人。`,
          rideId: input.rideId,
          applicationId: application.id,
        })
      : null;

    setData((current) => ({
      ...current,
      applications: [application, ...current.applications],
      notifications: [
        ...(ownerNotification ? [ownerNotification] : []),
        submittedNotification,
        ...current.notifications,
      ],
    }));
    return application;
  }, [currentUser, data.rides]);

  const acceptApplication = useCallback((applicationId: string): OperationResult => {
    const application = data.applications.find((item) => item.id === applicationId);
    const ride = data.rides.find((item) => item.id === application?.rideId);
    if (!application || !ride) return { ok: false, message: '申请或行程不存在。' };
    if (application.status !== 'pending' && application.status !== 'countered') {
      return { ok: false, message: '这份申请已经处理过了。' };
    }
    if (
      remainingSeats(ride) < application.people ||
      remainingGear(ride) < application.gearCount
    ) {
      return { ok: false, message: '剩余座位或雪具位不足，无法同意。' };
    }

    const confirmedPrice = application.counterPerPerson ?? application.offerPerPerson;
    const nextRouteVersion = ride.routeVersion + 1;
    const willBeFull = ride.seatsTaken + application.people >= ride.seatsTotal;
    const acceptedNotification = makeNotification({
      userId: application.applicant.id,
      type: 'application_accepted',
      title: `${ride.owner.name}已确认你的同行`,
      body: `${application.people} 个座位已锁定，价格 ¥${confirmedPrice} / 人，路线更新至第 ${nextRouteVersion} 版。`,
      rideId: ride.id,
      applicationId: application.id,
    });
    const fullNotification = willBeFull
      ? makeNotification({
          userId: ride.owner.id,
          type: 'seat_full',
          title: '你的拼车已满员',
          body: `${ride.destination}拼车座位已经确认完毕，新路线为第 ${nextRouteVersion} 版。`,
          rideId: ride.id,
          applicationId: application.id,
        })
      : null;

    setData((current) => ({
      ...current,
      rides: current.rides.map((item) =>
        item.id === ride.id
          ? {
              ...item,
              seatsTaken: item.seatsTaken + application.people,
              gearUsed: item.gearUsed + application.gearCount,
              routeVersion: item.routeVersion + 1,
              distanceKm: Math.max(item.distanceKm, application.newDistanceKm),
              durationMin: application.newDurationMin,
              status:
                item.seatsTaken + application.people >= item.seatsTotal
                  ? 'full'
                  : item.status,
            }
          : item,
      ),
      applications: current.applications.map((item) =>
        item.id === applicationId ? { ...item, status: 'accepted' } : item,
      ),
      notifications: [
        ...(fullNotification ? [fullNotification] : []),
        acceptedNotification,
        ...current.notifications,
      ],
    }));

    return { ok: true };
  }, [data]);

  const rejectApplication = useCallback((applicationId: string) => {
    const application = data.applications.find((item) => item.id === applicationId);
    const ride = data.rides.find((item) => item.id === application?.rideId);
    const notification =
      application && ride
        ? makeNotification({
            userId: application.applicant.id,
            type: 'application_rejected',
            title: `${ride.owner.name}暂未接受这次同行`,
            body: `去${ride.destination}的申请未成交，座位和路线没有变化。`,
            rideId: ride.id,
            applicationId: application.id,
          })
        : null;

    setData((current) => ({
      ...current,
      applications: current.applications.map((item) =>
        item.id === applicationId ? { ...item, status: 'rejected' } : item,
      ),
      notifications: notification
        ? [notification, ...current.notifications]
        : current.notifications,
    }));
  }, [data.applications, data.rides]);

  const counterApplication = useCallback((applicationId: string, perPersonPrice: number) => {
    const application = data.applications.find((item) => item.id === applicationId);
    const ride = data.rides.find((item) => item.id === application?.rideId);
    const notification =
      application && ride
        ? makeNotification({
            userId: application.applicant.id,
            type: 'counter_offer',
            title: `${ride.owner.name}回复了你的报价`,
            body: `回价 ¥${perPersonPrice} / 人，${application.people} 人共 ¥${perPersonPrice * application.people}。`,
            rideId: ride.id,
            applicationId: application.id,
          })
        : null;

    setData((current) => ({
      ...current,
      applications: current.applications.map((item) =>
        item.id === applicationId
          ? {
              ...item,
              status: 'countered',
              counterPerPerson: perPersonPrice,
            }
          : item,
      ),
      notifications: notification
        ? [notification, ...current.notifications]
        : current.notifications,
    }));
  }, [data.applications, data.rides]);

  const acceptCounterOffer = useCallback(
    (applicationId: string) => acceptApplication(applicationId),
    [acceptApplication],
  );

  const declineCounterOffer = useCallback((applicationId: string) => {
    const application = data.applications.find((item) => item.id === applicationId);
    const ride = data.rides.find((item) => item.id === application?.rideId);
    const notification =
      application && ride
        ? makeNotification({
            userId: ride.owner.id,
            type: 'application_withdrawn',
            title: `${application.applicant.name}没有接受回价`,
            body: `${application.people} 人已放弃这次同行，座位重新开放。`,
            rideId: ride.id,
            applicationId: application.id,
          })
        : null;

    setData((current) => ({
      ...current,
      applications: current.applications.map((item) =>
        item.id === applicationId ? { ...item, status: 'withdrawn' } : item,
      ),
      notifications: notification
        ? [notification, ...current.notifications]
        : current.notifications,
    }));
  }, [data.applications, data.rides]);

  const withdrawApplication = useCallback((applicationId: string) => {
    const application = data.applications.find((item) => item.id === applicationId);
    const ride = data.rides.find((item) => item.id === application?.rideId);
    const notification =
      application && ride
        ? makeNotification({
            userId: ride.owner.id,
            type: 'application_withdrawn',
            title: `${application.applicant.name}撤回了申请`,
            body: `${application.people} 人的同行申请已撤回，未占用座位。`,
            rideId: ride.id,
            applicationId: application.id,
          })
        : null;

    setData((current) => ({
      ...current,
      applications: current.applications.map((item) =>
        item.id === applicationId ? { ...item, status: 'withdrawn' } : item,
      ),
      notifications: notification
        ? [notification, ...current.notifications]
        : current.notifications,
    }));
  }, [data.applications, data.rides]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId && notification.userId === currentUser.id
          ? { ...notification, read: true }
          : notification,
      ),
    }));
  }, [currentUser.id]);

  const markAllNotificationsRead = useCallback(() => {
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.userId === currentUser.id ? { ...notification, read: true } : notification,
      ),
    }));
  }, [currentUser.id]);

  const rememberLocation = useCallback((location: string) => {
    const cleaned = location.trim();
    if (!cleaned) return;
    setData((current) => ({
      ...current,
      savedLocations: [
        cleaned,
        ...current.savedLocations.filter((item) => item !== cleaned),
      ].slice(0, 50),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    setData((current) => {
      const resetUser: User = {
        ...currentUser,
        name: current.account.name || defaultCurrentUser.name,
        initial:
          Array.from(current.account.name || defaultCurrentUser.name)[0] ??
          defaultCurrentUser.initial,
      };
      return {
        rides: seedRides.map((ride) =>
          ride.owner.id === currentUser.id ? { ...ride, owner: resetUser } : ride,
        ),
        applications: seedApplications.map((application) =>
          application.applicant.id === currentUser.id
            ? { ...application, applicant: resetUser }
            : application,
        ),
        notifications: seedNotifications,
        savedLocations: seedLocations,
        account: current.account,
      };
    });
  }, [currentUser]);

  const value = useMemo(
    () => ({
      ...data,
      hydrated,
      currentUser,
      completeOnboarding,
      updateAccount,
      addRide,
      submitApplication,
      acceptApplication,
      rejectApplication,
      counterApplication,
      acceptCounterOffer,
      declineCounterOffer,
      withdrawApplication,
      markNotificationRead,
      markAllNotificationsRead,
      rememberLocation,
      resetDemo,
    }),
    [
      acceptApplication,
      acceptCounterOffer,
      addRide,
      completeOnboarding,
      counterApplication,
      currentUser,
      data,
      declineCounterOffer,
      hydrated,
      markAllNotificationsRead,
      markNotificationRead,
      rejectApplication,
      rememberLocation,
      resetDemo,
      submitApplication,
      updateAccount,
      withdrawApplication,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}

export function getRemainingSeats(ride: Ride) {
  return remainingSeats(ride);
}

export function getRemainingGear(ride: Ride) {
  return remainingGear(ride);
}
