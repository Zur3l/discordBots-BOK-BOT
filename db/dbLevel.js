const dbClient = require('./dbClient');
const dbUtil = require('./dbUtil');

async function updateUser(serverID, userID, date) {
    let levelIncreased = false;

    const client = dbClient.getClient();
    await (async () => {
        await client.connect();

        let server = await dbUtil.getServerByID(serverID, client);
        if (!server) server = await dbUtil.addServer(serverID, client);

        let user = await dbUtil.getUserByID(userID, client);
        if (!user) user = await dbUtil.addUser(userID, client);

        let server_user = await dbUtil.getServerUserByID(server.id, user.id, client);
        if (!server_user) server_user = await dbUtil.addServerUser(server.id, user.id, date, client);

        const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
        const utcLastPoint = Date.UTC(server_user.last_earned_point.getFullYear(), server_user.last_earned_point.getMonth(), server_user.last_earned_point.getDate(), server_user.last_earned_point.getHours(), server_user.last_earned_point.getMinutes(), server_user.last_earned_point.getSeconds(), server_user.last_earned_point.getUTCMilliseconds());
        const diffTimeMS = Math.abs(utcDate - utcLastPoint);
        let level = server_user.level;
        if (diffTimeMS >= 60 * 1000) level = await dbUtil.addPointsToUser(server_user, date, client);

        levelIncreased = level - server_user.level > 0 ? level : false;
    })();
    await client.end();

    return levelIncreased;
}

module.exports = {
    updateUser
}
