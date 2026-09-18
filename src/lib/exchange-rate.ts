export type ExchangeRateQuote = {
  value: number | null;
  updatedAt: string | null;
};

export type ExchangeRateSnapshot = {
  official: ExchangeRateQuote;
  parallel: ExchangeRateQuote;
  fetchedAt: string;
};

type DolarApiQuote = {
  fuente?: string;
  promedio?: number | string | null;
  fechaActualizacion?: string | null;
};

const DOLAR_API_URL = "https://ve.dolarapi.com/v1/dolares";

export async function getExchangeRates(): Promise<ExchangeRateSnapshot> {
  const fallback: ExchangeRateSnapshot = {
    official: { value: null, updatedAt: null },
    parallel: { value: null, updatedAt: null },
    fetchedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(DOLAR_API_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return fallback;

    const quotes = (await response.json()) as DolarApiQuote[];
    const official = quotes.find((quote) => quote.fuente === "oficial");
    const parallel = quotes.find((quote) => quote.fuente === "paralelo");
    const value = (quote?: DolarApiQuote) => {
      const parsed = Number(quote?.promedio);
      return Number.isFinite(parsed) ? parsed : null;
    };
    return {
      official: { value: value(official), updatedAt: official?.fechaActualizacion ?? null },
      parallel: { value: value(parallel), updatedAt: parallel?.fechaActualizacion ?? null },
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
}
