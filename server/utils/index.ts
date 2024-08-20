import { HELIUS_API_KEY } from "../config";

export function buildQueryParams(params: object): string {
    const query = new URLSearchParams(params as any);
    query.append('api-key', String(HELIUS_API_KEY));
    return query.toString();
}