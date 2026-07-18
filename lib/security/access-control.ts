export type Principal = {
  userId: string;
  tenantId: string;
};

export type OwnedObject = {
  ownerId: string;
  tenantId: string;
};

export type ObjectAction = "create" | "read" | "update" | "delete";

export class AccessDeniedError extends Error {
  readonly code = "ACCESS_DENIED";

  constructor() {
    super("ACCESS_DENIED");
    this.name = "AccessDeniedError";
  }
}

function validIdentifier(value: string) {
  return value.length > 0 && value.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(value);
}

export function requirePrincipal(principal: Principal | null | undefined): Principal {
  if (
    !principal ||
    !validIdentifier(principal.userId) ||
    !validIdentifier(principal.tenantId)
  ) {
    throw new AccessDeniedError();
  }
  return principal;
}

export function authorizeObject(
  principalInput: Principal | null | undefined,
  action: ObjectAction,
  object?: OwnedObject,
) {
  const principal = requirePrincipal(principalInput);
  if (action === "create") return principal;
  if (
    !object ||
    object.ownerId !== principal.userId ||
    object.tenantId !== principal.tenantId
  ) {
    throw new AccessDeniedError();
  }
  return principal;
}

export type AdmissionLimits = {
  maxRequestsPerWindow: number;
  windowMs: number;
  maxConcurrent: number;
  maxQuotaPerPeriod: number;
  quotaPeriodMs: number;
};

export type AdmissionRequest = {
  principal: Principal;
  idempotencyKey: string;
};

export type AdmissionLease = {
  release(): void;
};

export type AdmissionRejectionCode =
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "CONCURRENCY_LIMITED"
  | "REPLAY_REJECTED";

export class AdmissionRejectedError extends Error {
  constructor(public readonly code: AdmissionRejectionCode) {
    super(code);
    this.name = "AdmissionRejectedError";
  }
}

type SubjectState = {
  requestWindowStartedAt: number;
  requestCount: number;
  quotaPeriodStartedAt: number;
  quotaCount: number;
  concurrent: number;
  replayKeys: Map<string, number>;
};

function positiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

export class InMemoryAdmissionController {
  private readonly subjects = new Map<string, SubjectState>();

  constructor(
    private readonly limits: AdmissionLimits,
    private readonly now: () => number = Date.now,
  ) {
    if (
      !positiveInteger(limits.maxRequestsPerWindow) ||
      !positiveInteger(limits.windowMs) ||
      !positiveInteger(limits.maxConcurrent) ||
      !positiveInteger(limits.maxQuotaPerPeriod) ||
      !positiveInteger(limits.quotaPeriodMs)
    ) {
      throw new Error("Invalid admission limits.");
    }
  }

  acquire(request: AdmissionRequest): AdmissionLease {
    const principal = requirePrincipal(request.principal);
    if (!validIdentifier(request.idempotencyKey)) {
      throw new AdmissionRejectedError("REPLAY_REJECTED");
    }
    const now = this.now();
    const subjectKey = `${principal.tenantId}:${principal.userId}`;
    const state = this.state(subjectKey, now);
    this.resetExpiredWindows(state, now);
    this.removeExpiredReplayKeys(state, now);

    if (state.replayKeys.has(request.idempotencyKey)) {
      throw new AdmissionRejectedError("REPLAY_REJECTED");
    }
    if (state.requestCount >= this.limits.maxRequestsPerWindow) {
      throw new AdmissionRejectedError("RATE_LIMITED");
    }
    if (state.quotaCount >= this.limits.maxQuotaPerPeriod) {
      throw new AdmissionRejectedError("QUOTA_EXCEEDED");
    }
    if (state.concurrent >= this.limits.maxConcurrent) {
      throw new AdmissionRejectedError("CONCURRENCY_LIMITED");
    }

    state.requestCount += 1;
    state.quotaCount += 1;
    state.concurrent += 1;
    state.replayKeys.set(request.idempotencyKey, now + this.limits.quotaPeriodMs);
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        state.concurrent = Math.max(0, state.concurrent - 1);
      },
    };
  }

  private state(subjectKey: string, now: number) {
    const existing = this.subjects.get(subjectKey);
    if (existing) return existing;
    const created: SubjectState = {
      requestWindowStartedAt: now,
      requestCount: 0,
      quotaPeriodStartedAt: now,
      quotaCount: 0,
      concurrent: 0,
      replayKeys: new Map(),
    };
    this.subjects.set(subjectKey, created);
    return created;
  }

  private resetExpiredWindows(state: SubjectState, now: number) {
    if (now - state.requestWindowStartedAt >= this.limits.windowMs) {
      state.requestWindowStartedAt = now;
      state.requestCount = 0;
    }
    if (now - state.quotaPeriodStartedAt >= this.limits.quotaPeriodMs) {
      state.quotaPeriodStartedAt = now;
      state.quotaCount = 0;
    }
  }

  private removeExpiredReplayKeys(state: SubjectState, now: number) {
    for (const [key, expiresAt] of state.replayKeys) {
      if (expiresAt <= now) state.replayKeys.delete(key);
    }
  }
}
