import { query } from '../database/pool';

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
    `SELECT keyword, numbers, description, language
     FROM dream_dictionary
     WHERE ${conditions.join(' AND ')}
     ORDER BY keyword`,
    values
  );

  return result.rows.map((r) => ({
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
    `SELECT keyword, numbers, description, language FROM dream_dictionary ${condition} ORDER BY keyword`,
    values
  );

  return result.rows;
}
