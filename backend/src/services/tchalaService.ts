import { query } from '../database/pool';
import { AppError } from '../middleware/errorHandler';

/**
 * Search dream dictionary.
 */
export async function searchDreams(keyword: string, language?: string) {
  const conditions = [
    `(keyword ILIKE $1 OR description ILIKE $1)`
  ];
  const values: any[] = [`%${keyword}%`];
  let paramIndex = 2;

  if (language) {
    conditions.push(`language = $${paramIndex++}`);
    values.push(language);
  }

  const result = await query(
    `SELECT id, keyword, numbers, description, language
     FROM dream_dictionary
     WHERE ${conditions.join(' AND ')}
     ORDER BY keyword`,
    values
  );

  return result.rows.map((r) => ({
    id: r.id,
    keyword: r.keyword,
    numbers: r.numbers,
    description: r.description,
    language: r.language,
  }));
}

/**
 * Get all dream dictionary entries.
 */
export async function getAllDreams(language?: string) {
  const condition = language ? 'WHERE language = $1' : '';
  const values = language ? [language] : [];

  const result = await query(
    `SELECT id, keyword, numbers, description, language FROM dream_dictionary ${condition} ORDER BY keyword`,
    values
  );

  return result.rows;
}

/**
 * Create a new dream dictionary entry (admin).
 */
export async function createDream(data: { keyword: string; numbers: number[]; description?: string; language?: string }) {
  const result = await query(
    `INSERT INTO dream_dictionary (keyword, numbers, description, language)
     VALUES ($1, $2, $3, $4)
     RETURNING id, keyword, numbers, description, language`,
    [data.keyword, JSON.stringify(data.numbers), data.description || '', data.language || 'ht']
  );
  return result.rows[0];
}

/**
 * Update a dream dictionary entry (admin).
 */
export async function updateDream(id: string, data: { keyword?: string; numbers?: number[]; description?: string; language?: string }) {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.keyword !== undefined) {
    setClauses.push(`keyword = $${paramIndex++}`);
    values.push(data.keyword);
  }
  if (data.numbers !== undefined) {
    setClauses.push(`numbers = $${paramIndex++}`);
    values.push(JSON.stringify(data.numbers));
  }
  if (data.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.language !== undefined) {
    setClauses.push(`language = $${paramIndex++}`);
    values.push(data.language);
  }

  if (setClauses.length === 0) return null;

  values.push(id);
  const result = await query(
    `UPDATE dream_dictionary SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id, keyword, numbers, description, language`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Dream entry not found', 404);
  }
  return result.rows[0];
}

/**
 * Delete a dream dictionary entry (admin).
 */
export async function deleteDream(id: string) {
  const result = await query(
    'DELETE FROM dream_dictionary WHERE id = $1 RETURNING id',
    [id]
  );
  if (result.rows.length === 0) {
    throw new AppError('Dream entry not found', 404);
  }
}
