import { Repository, FindManyOptions, ObjectLiteral } from 'typeorm';

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

// Colonnes autorisees au tri. Durcissement preventif : un sort hors liste
// retombe sur 'created_at' (aucun appelant ne passe sort a paginate aujourd'hui).
const SORTABLE_COLUMNS = ['created_at', 'updated_at', 'id'];

export function parsePagination(query: any): { page: number; limit: number; sort: string; order: 'ASC' | 'DESC'; search: string } {
  const page  = Math.max(1, parseInt(query?.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit) || 10));
  const sort  = SORTABLE_COLUMNS.includes(query?.sort) ? query.sort : 'created_at';
  const order = (query?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
  const search = (query?.search || '').trim().slice(0, 100);
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

  const orderBy: any = {};
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
    order: options.order || orderBy,
  });

  return { data, meta: buildMeta(page, limit, total) };
}

export async function paginateRaw(
  dataSource: any,
  countQuery: string,
  dataQuery: string,
  params: any[],
  paginationParams: PaginationParams,
): Promise<PaginatedResult<any>> {
  const { page, limit } = parsePagination(paginationParams);
  const skip = (page - 1) * limit;

  const countResult = await dataSource.query(countQuery, params);
  const total = parseInt(countResult[0]?.count || '0');

  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const data = await dataSource.query(dataQuery + ` LIMIT $${limitParam} OFFSET $${offsetParam}`, [...params, limit, skip]);

  return { data, meta: buildMeta(page, limit, total) };
}
