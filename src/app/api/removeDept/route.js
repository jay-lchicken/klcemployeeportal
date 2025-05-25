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

    const {userIds, departmentName, userId} = body;

    if (!Array.isArray(userIds) || userIds.length === 0 || !departmentName || !userId) {
        return respondError(
            'Invalid request. Ensure userIds is a valid array and departmentName is provided.',
            null,
            400
        );
    }

     const client = new Client({
        user: 'postgres',
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT, 10),
    });
    try {
        await client.connect()
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

    } catch (err) {
        return respondError('Database error', err.message, 500);
    }
    try {

        const userIdArray = typeof body.userIds === 'string'
            ? body.userIds.split(',').map(id => id.trim())
            : body.userIds;

        const departmentName = body.departmentName;

        const res = await client.query(
            `
                DELETE
                FROM user_departments ud USING departments d
                WHERE ud.department_id = d.id
                  AND d.name = $2
                  AND ud.user_id = ANY ($1::text[])
            `,
            [userIdArray, departmentName]
        );

        return NextResponse.json({
            success: true,
            message: `${res.rowCount} users were removed from the department "${departmentName}" "${body.userIds}".`,
        });
    } catch (err) {
        console.error('Error during bulk removal', err);
        return respondError('Database error', err.message, 500);
    } finally {
        try {
            await client.end();
        } catch (err) {
            console.error('Failed to close database connection', err.message);
        }
    }
}