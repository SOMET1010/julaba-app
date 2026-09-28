import { Repository, FindManyOptions, ObjectLiteral, DataSource } from 'typeorm';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc' | 'ASC' | 'DESC';
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Entrée du parseur de pagination.
 *
 * Accepte indifféremment :
 * - un objet `@Query()` NestJS (valeurs `string` issues du querystring),
 * - un `PaginationParams` typé (`page`/`limit` en `number`),
 * - `undefined` (défaut sûr).
 *
 * `unknown` oblige à narrower explicitement chaque champ, évitant les `any`
 * qui masquent les bugs de nullité.
 */
export type PaginationInput = Record<string, unknown> | PaginationParams | undefined;

// Colonnes autorisees au tri. Durcissement preventif : un sort hors liste
// retombe sur 'created_at' (aucun appelant ne passe sort a paginate aujourd'hui).
const SORTABLE_COLUMNS: readonly string[] = ['created_at', 'updated_at', 'id'];

// Helper : extrait une chaîne d'une valeur inconnue (garantit `string`).
function readString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function parsePagination(
  query: PaginationInput,
): { page: number; limit: number; sort: string; order: 'ASC' | 'DESC'; search: string } {
  const q = (query ?? {}) as Record<string, unknown>;
  const page  = Math.max(1, parseInt(readString(q.page), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(readString(q.limit), 10) || 10));
  const requestedSort = readString(q.sort);
  const sort  = requestedSort && SORTABLE_COLUMNS.includes(requestedSort) ? requestedSort : 'created_at';
  const order = readString(q.order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const search = readString(q.search).trim().slice(0, 100);
  return { page, limit, sort, order, search };
}

export function buildMeta(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export async function paginate<T extends ObjectLiteral>(
  repo: Repository<T>,
  params: PaginationParams,
  options: FindManyOptions<T> = {},
): Promise<PaginatedResult<T>> {
  const { page, limit, sort, order } = parsePagination(params);
  const skip = (page - 1) * limit;

  const orderBy: Record<string, 'ASC' | 'DESC'> = {};
  if (sort && sort !== 'created_at') {
    orderBy[sort] = order;
  } else {
    orderBy['createdAt'] = order;
    orderBy['created_at'] = order;
  }

  const [data, total] = await repo.findAndCount({
    ...options,
    skip,
    take: limit,
    // `orderBy` est un dictionnaire plat `colonne -> 'ASC' | 'DESC'`. TypeORM
    // attend `FindOptionsOrder<T>` (récursif pour les relations) ; le cast est
    // sûr car nous ne ciblons que des colonnes simples (SORTABLE_COLUMNS).
    order: options.order ?? (orderBy as FindManyOptions<T>['order']),
  });

  return { data, meta: buildMeta(page, limit, total) };
}

export async function paginateRaw<T = Record<string, unknown>>(
  dataSource: DataSource,
  countQuery: string,
  dataQuery: string,
  params: unknown[],
  paginationParams: PaginationParams,
): Promise<PaginatedResult<T>> {
  const { page, limit } = parsePagination(paginationParams);
  const skip = (page - 1) * limit;

  const countResult = await dataSource.query(countQuery, params);
  const total = parseInt(readString(countResult?.[0]?.count), 10) || 0;

  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const data = await dataSource.query(
    dataQuery + ` LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...params, limit, skip],
  );

  return { data, meta: buildMeta(page, limit, total) };
}
