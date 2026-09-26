export type ExchangeRateQuote = {
  value: number | null;
  updatedAt: string | null;
};

export type ExchangeRateSnapshot = {
  official: ExchangeRateQuote;
  parallel: ExchangeRateQuote;
  fetchedAt: string;
};

export type StoreExchangeRateSettings = {
  exchange_rate_mode: "automatic" | "manual" | string | null;
  manual_exchange_rate: number | string | null;
  current_exchange_rate: number | string | null;
  exchange_rate_updated_at: string | null;
};

export type StoreExchangeRate = {
  value: number | null;
  source: "bcv" | "manual" | "stored_bcv" | "unavailable";
  updatedAt: string | null;
};

type DolarApiQuote = {
  fuente?: string;
  promedio?: number | string | null;
  fechaActualizacion?: string | null;
};

const DOLAR_API_BASE_URL = "https://ve.dolarapi.com/v1";
const REVALIDATE_SECONDS = 30 * 60;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_STORED_RATE_AGE_MS = 96 * 60 * 60 * 1000;

function positiveNumber(value: number | string | null | undefined) {
  const normalized =
    typeof value === "string" ? value.trim().replace(",", ".") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function auditPrecisionRate(value: number | string | null | undefined) {
  const parsed = positiveNumber(value);
  return parsed === null
    ? null
    : Math.round((parsed + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function validDate(value: string | null | undefined) {
  if (!value) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function parseQuote(quote: DolarApiQuote | null | undefined): ExchangeRateQuote {
  return {
    value: auditPrecisionRate(quote?.promedio),
    updatedAt: validDate(quote?.fechaActualizacion),
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Exchange-rate provider returned HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchDirectQuote(kind: "oficial" | "paralelo") {
  const payload = await fetchJson(`${DOLAR_API_BASE_URL}/dolares/${kind}`);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Invalid ${kind} exchange-rate response`);
  }
  const quote = parseQuote(payload as DolarApiQuote);
  if (quote.value === null) {
    throw new Error(`Missing ${kind} exchange-rate value`);
  }
  return quote;
}

async function fetchQuoteList() {
  const payload = await fetchJson(`${DOLAR_API_BASE_URL}/dolares`);
  if (!Array.isArray(payload)) {
    throw new Error("Invalid exchange-rate list response");
  }
  return payload as DolarApiQuote[];
}

export async function getExchangeRates(): Promise<ExchangeRateSnapshot> {
  const fetchedAt = new Date().toISOString();
  let official: ExchangeRateQuote = { value: null, updatedAt: null };
  let parallel: ExchangeRateQuote = { value: null, updatedAt: null };

  const [officialResult, parallelResult] = await Promise.allSettled([
    fetchDirectQuote("oficial"),
    fetchDirectQuote("paralelo"),
  ]);

  if (officialResult.status === "fulfilled") {
    official = officialResult.value;
  }
  if (parallelResult.status === "fulfilled") {
    parallel = parallelResult.value;
  }

  if (official.value === null || parallel.value === null) {
    try {
      const quotes = await fetchQuoteList();
      if (official.value === null) {
        official = parseQuote(
          quotes.find(
            (quote) => quote.fuente?.trim().toLowerCase() === "oficial",
          ),
        );
      }
      if (parallel.value === null) {
        parallel = parseQuote(
          quotes.find(
            (quote) => quote.fuente?.trim().toLowerCase() === "paralelo",
          ),
        );
      }
    } catch (error) {
      console.warn("Exchange-rate fallback lookup failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return { official, parallel, fetchedAt };
}

export function resolveStoreExchangeRate(
  store: StoreExchangeRateSettings,
  rates?: ExchangeRateSnapshot | null,
): StoreExchangeRate {
  if (store.exchange_rate_mode === "manual") {
    const manualRate = auditPrecisionRate(store.manual_exchange_rate);
    return {
      value: manualRate,
      source: manualRate === null ? "unavailable" : "manual",
      updatedAt: null,
    };
  }

  const officialValue = auditPrecisionRate(rates?.official.value);
  if (officialValue !== null) {
    return {
      value: officialValue,
      source: "bcv",
      updatedAt: rates?.official.updatedAt ?? rates?.fetchedAt ?? null,
    };
  }

  const storedValue = auditPrecisionRate(store.current_exchange_rate);
  const storedAt = validDate(store.exchange_rate_updated_at);
  const storedAge = storedAt ? Date.now() - new Date(storedAt).getTime() : NaN;
  if (
    storedValue !== null &&
    Number.isFinite(storedAge) &&
    storedAge >= 0 &&
    storedAge <= MAX_STORED_RATE_AGE_MS
  ) {
    return {
      value: storedValue,
      source: "stored_bcv",
      updatedAt: storedAt,
    };
  }

  return { value: null, source: "unavailable", updatedAt: storedAt };
}
