import fs from 'fs';
import path from 'path';
import pool from './pool';

async function migrate() {
  console.log('🔧 Running database migration...');
  
  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
