import {NextResponse} from "next/server";
import {Client} from "pg";

const respondError = (message, details = null, status = 500) => {
    return NextResponse.json({success: false, error: {message, details, code: status}}, {status});
};

export async function POST(request) {
    let body;

    try {
        body = await request.json();
    } catch {
        return respondError('Invalid or missing JSON body', null, 400);
    }

    const {userIds, reason, change, date_added, userId} = body;

    if (!Array.isArray(userIds) || !reason || typeof change !== 'number' || !date_added || !userId) {
        return respondError('Missing or invalid input fields', null, 400);
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

        // Check if the requestor is part of Exco
        const res = await client.query(
            `SELECT d.name
             FROM user_departments ud
                      JOIN departments d ON ud.department_id = d.id
             WHERE ud.user_id = $1`,
            [userId]
        );
        const hasExco = res.rows.some(row => row.name === 'Exco');
        if (!hasExco) {
            return respondError('Unauthorized: Not an exco member', null, 403);
        }

        
        const insertValues = userIds.map((id, index) =>
            `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`
        ).join(',');
        const insertParams = userIds.flatMap(id => [id, reason, change, date_added]);

        await client.query(
            `INSERT INTO points_logs (user_id, reason, change, date_added)
             VALUES ${insertValues}`,
            insertParams
        );

        const updateValues = userIds.map((_, idx) => `$${idx + 1}`).join(', ');
        await client.query(
            `UPDATE users
             SET points = points + $${userIds.length + 1}
             WHERE id IN (${updateValues})`,
            [...userIds, change]
        );
        return NextResponse.json({
            success: true,
            message: `Added points log for ${userIds.length} user(s).`,
            updatedUserIds: userIds
        });

    } catch (err) {
        console.error('Error during bulk insertion to points_logs:', err);
        return respondError('Database error', err.message, 500);
    } finally {
        try {
            await client.end();
        } catch (err) {
            console.error('Failed to close database connection', err.message);
        }
    }
}