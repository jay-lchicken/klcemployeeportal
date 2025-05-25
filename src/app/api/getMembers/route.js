import { NextResponse } from "next/server";
import { Client } from "pg";
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid or missing JSON body' }, { status: 400 });
  }




   const client = new Client({
        user: 'postgres',
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT, 10),
    });
  try{
    await client.connect();
    const res = await client.query(
      `SELECT d.name
       FROM user_departments ud
       JOIN departments d ON ud.department_id = d.id
       WHERE ud.user_id = $1`,
      [body.userId]
    );
    const hasExco = res.rows.some(row => row.name === 'Exco');
    if (!hasExco){
      return NextResponse.json({ error: 'Unauthorized: Not an exco member' }, { status: 403 });

    }
  }catch (err) {
    return NextResponse.json({ error: 'Database error', details: err.message }, { status: 500 });
  }
  try {
    const res = await client.query(`SELECT
    users.id AS user_id,
    users.name AS name,
    users.email AS email,
    COALESCE(departments.name, '') AS department,
    users.points
FROM users
LEFT JOIN user_departments ON users.id = user_departments.user_id
LEFT JOIN departments ON user_departments.department_id = departments.id;`);
    return NextResponse.json({res });
  } catch (err) {
    return NextResponse.json({ error: 'Database error', details: err.message }, { status: 500 });
  } finally {
    await client.end();
  }
}