import { NextResponse } from "next/server";
import { Client } from "pg";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid or missing JSON body' }, { status: 400 });
  }

  const userId = body.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId in request body' }, { status: 400 });
  }

   const client = new Client({
        user: 'postgres',
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT, 10),
    });

  try {
    await client.connect();

    const res = await client.query(
      `SELECT d.name
       FROM user_departments ud
       JOIN departments d ON ud.department_id = d.id
       WHERE ud.user_id = $1`,
      [userId]
    );

    if (res.rows.length > 0) {
      return NextResponse.json({ res: res.rows });
    }

    const res2 = await client.query(
      `SELECT name FROM users WHERE id = $1`,
      [userId]
    );

    if (res2.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, name, email) VALUES ($1, $2, $3)`,
        [userId, body.name, body.email]
      );
      return NextResponse.json({ error: 'User not registered' }, { status: 404 });
    } else {
      return NextResponse.json({ error: 'User not in department' }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Database error', details: err.message }, { status: 500 });
  } finally {
    await client.end();
  }
}