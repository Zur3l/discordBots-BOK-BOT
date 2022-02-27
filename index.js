require('dotenv').config();
const {Client, Intents, MessagePayload} = require('discord.js');
let bot = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS]
});
const TOKEN = process.env.TOKEN;

const util = require('./util.js');
const newMember = require('./commands/newMember/execute.js');
const newBotMember = require('./commands/newBotMember/execute.js');
const updateUserRole = require('./commands/updateUserRole/execute.js');
const consoleInput = require('./commands/console/input.js');

const logs = require('./commands/serverLogs/execute.js');
const buttonRole = require('./commands/buttonRole/execute.js');
const role = require('./commands/role/execute.js');
const startScore = require('./commands/startScore/execute.js');
const test = require('./commands/test/execute.js');

const log = require('./commands/serverLogs/log.js');

bot.login(TOKEN).then(r => console.log('Used token: ' + r));

bot.on('ready', () => {
    util.ready(bot);
});

const consoleListener = process.openStdin();
consoleListener.addListener('data', res => {
    try {
        consoleInput.input(bot, res)
    } catch (err) {
        util.createLog(err);
    }
});

bot.ws.on('INTERACTION_CREATE', async interaction => {
    try {
        //console.log(interaction)
        let type = interaction.type;
        let guildID = interaction.guild_id;
        let guild = bot.guilds.cache.get(guildID);
        let authorID = interaction.member.user.id;
        let author = await guild.members.fetch(authorID);
        //console.log(author);
        util.createDir('./servers/' + guildID);
        let rolesFile = './servers/' + guildID + '/roles.txt';
        let name = interaction.data.name;
        let content = 'An error occurred and a response could not be generated';
        console.log('Interaction type ' + type + ' used by ' + authorID + ' in guild ' + guildID + ' in channel ' + interaction.channel_id);
        //console.log(interaction);

        switch (type) {
            case 1:
                console.log('type == 1');
                console.log(interaction);
                break;

            case 2:
                if (util.isAdmin(author)) {
                    switch (name) {
                        case 'logs':
                            content = logs.execute(interaction, guild);
                            break;

                        case 'buttonrole':
                            let message = buttonRole.execute(interaction, guild);
                            let msg = message.content;
                            let components = message.components;
                            bot.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 4,
                                    data: {
                                        content: msg,
                                        components: components
                                    }
                                }
                            });
                            return;

                        case 'role':
                            content = role.execute(interaction, rolesFile, guild);
                            break;

                        case 'startscore':
                            content = startScore.execute(guild, rolesFile, {
                                url: 'https://mee6.xyz/api/plugins/levels/leaderboard/' + guildID,
                                json: true
                            });
                            break;

                        case 'test':
                            content = test.execute();
                    }
                } else {
                    return util.notAdmin();
                }
                break;

            case 3:
                buttonRole.buttonClicked(interaction, author, guild);
                content = undefined;
                bot.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 6
                    }
                }).catch(reason => {console.log(reason)})
                return;
        }

        const reply = async (interaction, response) => {
            let data
            if (typeof response === 'object') {
                data = {
                    embeds: [response]
                };
            } else {
                data = {
                    content: response
                };
            }

            bot.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data
                }
            });
        };
        await reply(interaction, content);

    } catch (err) {
        util.createLog(err);
    }
});

bot.on('guildMemberAdd', async member => {
    try {
        const guild = member.guild;
        const guildID = guild.id;
        util.createDir('./servers/' + guildID);
        const rolesFile = './servers/' + guildID + '/roles.txt';
        const botRolesFile = './servers/' + guildID + '/botroles.txt';
        util.createFile(rolesFile);
        util.createFile(botRolesFile);
        console.log(member.id + ' joined ' + guildID);

        log.log(types.JOINED, guild, member);

        if (!member.user.bot) { //not bot
            const options = {
                url: 'https://mee6.xyz/api/plugins/levels/leaderboard/' + guildID,
                json: true
            };
            newMember.execute(member, rolesFile, options);

        } else if (member.user.bot) { //is bot
            newBotMember.execute(member, botRolesFile);

        } else {
            console.log('member\'s user.bot is neither true nor false, no roles given');
        }
    } catch (err) {
        util.createLog(err);
    }
});

bot.on('messageCreate', msg => {
    try {
        const msgContent = msg.content;
        const guildID = msg.guild.id;
        util.createDir('./servers/' + guildID);
        const rolesFile = './servers/' + guildID + '/roles.txt';
        const member = msg.mentions.members.first();
        const options = {
            url: 'https://mee6.xyz/api/plugins/levels/leaderboard/' + guildID,
            json: true
        }
        if (msg.author.id === '159985870458322944' && member !== undefined) {
            updateUserRole.execute(msg, msgContent, member, rolesFile, options);

        } else if (!msg.author.bot) {
            // Tom Tbomb easter egg
            if (msgContent === 'Tom') {
                msg.channel.send('Tbomb!');
            }
        }
    } catch (err) {
        util.createLog(err);
        msg.channel.send('An error occurred!');
    }
});

const types = require('./types.js')

bot.on('messageUpdate', (oldMessage, newMessage) => {
    try {
        console.log(oldMessage.author.id + ' edited message in guild ' + oldMessage.channel.guild.id + ' in channel ' + oldMessage.channel.id);
        log.log(types.EDITED, oldMessage.channel.guild, oldMessage, newMessage);
    } catch (err) {
        util.createLog(err);
        oldMessage.channel.send('An error occurred!');
    }
});

bot.on("messageDelete", (deleteMessage) => {
    try {
        console.log(deleteMessage.author.id + ' deleted message in guild ' + deleteMessage.channel.guild.id + ' in channel ' + deleteMessage.channel.id);
        log.log(types.DELETED, deleteMessage.channel.guild, deleteMessage);
    } catch (err) {
        util.createLog(err);
        deleteMessage.channel.send('An error occurred!');
    }
});

bot.on('guildMemberRemove', member => {
    try {
        console.log(member.id + ' left ' + member.guild.id);
        log.log(types.LEFT, member.guild, member);
    } catch (err) {
        util.createLog(err);
    }
});