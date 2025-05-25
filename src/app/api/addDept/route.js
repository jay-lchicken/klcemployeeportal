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
        await client.connect();

        // Check if requester is an exco member
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

        const userIdArray = typeof body.userIds === 'string'
            ? body.userIds.split(',').map(id => id.trim())
            : body.userIds;

        // Get department ID by name
        const deptResult = await client.query(
            `SELECT id FROM departments WHERE name = $1`,
            [departmentName]
        );

        if (deptResult.rowCount === 0) {
            return respondError('Department not found', null, 404);
        }

        const departmentId = deptResult.rows[0].id;

        // Check for existing user-department links
        const existingRes = await client.query(
            `
            SELECT user_id
            FROM user_departments
            WHERE department_id = $1
              AND user_id = ANY($2::text[])
            `,
            [departmentId, userIdArray]
        );

        const existingUserIds = existingRes.rows.map(row => row.user_id);
        const newUserIds = userIdArray.filter(id => !existingUserIds.includes(id));

        // Insert only non-duplicate users
        if (newUserIds.length > 0) {
            await client.query(
                `
                INSERT INTO user_departments (user_id, department_id)
                SELECT user_id, $1
                FROM unnest($2::text[]) AS user_id
                `,
                [departmentId, newUserIds]
            );
        }

        return NextResponse.json({
            success: true,
            message: `Processed user assignment to "${departmentName}".`,
            addedUsers: newUserIds,
            alreadyInDepartment: existingUserIds
        });

    } catch (err) {
        console.error('Error during bulk addition', err);
        return respondError('Database error', err.message, 500);
    } finally {
        try {
            await client.end();
        } catch (err) {
            console.error('Failed to close database connection', err.message);
        }
    }
}