export type User = {
  id: string;
  name: string;
  initial: string;
  color: string;
  phoneVerified: boolean;
  ridesTogether: number;
};

export type LocalAccount = {
  name: string;
  phone: string;
  vehicleModel: string;
  vehicleColor: string;
  plateNumber: string;
  onboardingCompleted: boolean;
  privacyAcceptedAt?: string;
};

export type CompleteOnboardingInput = {
  name: string;
  phone: string;
};

export type UpdateAccountInput = Partial<
  Pick<LocalAccount, 'name' | 'phone' | 'vehicleModel' | 'vehicleColor' | 'plateNumber'>
>;

export type RouteStopKind = 'origin' | 'pickup' | 'destination';

export type RouteStop = {
  id: string;
  name: string;
  area: string;
  kind: RouteStopKind;
  time: string;
  exactVisible: boolean;
};

export type RideStatus = 'recruiting' | 'full' | 'departed' | 'completed' | 'cancelled';

export type Ride = {
  id: string;
  owner: User;
  origin: string;
  destination: string;
  dateLabel: string;
  startTime: string;
  eta: string;
  distanceKm: number;
  durationMin: number;
  hasRouteSample: boolean;
  minPrice: number;
  suggestedPrice: number;
  seatsTotal: number;
  seatsTaken: number;
  gearTotal: number;
  gearUsed: number;
  status: RideStatus;
  routeVersion: number;
  stops: RouteStop[];
  rules: string[];
  note: string;
  createdAt: string;
};

export type ApplicationStatus =
  | 'pending'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired';

export type Application = {
  id: string;
  rideId: string;
  applicant: User;
  people: number;
  gearCount: number;
  pickup: string;
  offerPerPerson: number;
  counterPerPerson?: number;
  status: ApplicationStatus;
  addedMinutes: number;
  newDistanceKm: number;
  newDurationMin: number;
  createdAt: string;
};

export type CreateRideInput = {
  origin: string;
  destination: string;
  dateLabel: string;
  startTime: string;
  minPrice: number;
  seatsTotal: number;
  gearTotal: number;
  maxDetourMinutes: number;
  note: string;
};

export type CreateApplicationInput = {
  rideId: string;
  people: number;
  gearCount: number;
  pickup: string;
  offerPerPerson: number;
};

export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  source: 'local' | 'recent' | 'osm' | 'amap';
};

export type NotificationType =
  | 'application_received'
  | 'application_submitted'
  | 'counter_offer'
  | 'application_accepted'
  | 'application_rejected'
  | 'application_withdrawn'
  | 'seat_full';

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  rideId?: string;
  applicationId?: string;
  createdAt: string;
  read: boolean;
};
