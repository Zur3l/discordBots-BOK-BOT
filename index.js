require('dotenv').config();
const Discord = require('discord.js');
let bot = new Discord.Client();
const fs = require('fs');
const rp = require('request-promise');
const TOKEN = process.env.TOKEN;
let roleLevel = 0;
const customPrefix = '!bok'

bot.login(TOKEN).then(r => console.log('Used token: ' + r));

bot.on('ready', () => {
    ready(bot)
});

const consoleListener = process.openStdin();
consoleListener.addListener('data', res => {
    try {
        const consoleMsg = res.toString().toLocaleLowerCase().trim().split(/ +/g).join(' ');
        if (consoleMsg === 'test') {
            console.log('test successful');

        } else if (consoleMsg === 'restart' || consoleMsg === 'reboot') {
            bot.channels.cache.get('738439111412809730').send(':yellow_circle: Bot is restarting.')
                .then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`))
                .then(() => reboot())
                .catch(console.error);

        } else if (consoleMsg === 'stop') {
            console.log('Stopping');
            bot.channels.cache.get('738439111412809730').send(':red_circle: Bot has stopped.')
                .then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`))
                .then(msg => process.exit(0))
                .catch(console.error);
        }
    } catch (err) {
        console.error(err);
    }
});

bot.on('message', msg => {
    try {
        const msgContent = msg.content;
        const serverID = msg.guild.id;
        const rolesFile = 'servers/' + serverID + '.roles';
        const member = msg.mentions.members.first();
        const options = {
            url: 'https://mee6.xyz/api/plugins/levels/leaderboard/' + serverID,
            json: true
        }
        if (msg.author.id === '159985870458322944' && member !== undefined) {
            const msgArgs = msgContent.slice(0).split(' ');
            const lines = fs.readFileSync(rolesFile, 'utf8').split('\n');
            let args = [];
            let role = '';
            for (let i = 0; i < lines.length; i++) {
                args.push(lines[i].split(' '))
                if (Number(msgArgs[7]) === args[i][1]) {
                    role = member.guild.roles.find(role => role.id === args[i][0]);
                    member.roles.add(role).then(console.log('Role ' + role.id + ' given to ' + member.id)).catch(console.error);
                    msg.channel.send('Congratulations <@' + member.id + '>, you have just received the <@&' + role.id + '> role!').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                    break;
                }
            }


        } else if (msgContent.startsWith(customPrefix)) {
            //test connection to bot
            if (msgContent === 'test' || msgContent === '!bok test') {
                msg.reply('Test Successful').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error); //mentions pinger + pong
                msg.channel.send('Test Successful').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error); //pong

                //displays help list
            } else if (msgContent === '!bok help') {
                msg.channel.send('!bok help - pulls up this list\n!bok helpAdmin - pulls up the help list for admins').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);

                //displays admin help list
            } else if (msgContent === '!bok helpAdmin') {
                if (isAdmin(msg)) {
                    msg.channel.send('!bok helpAdmin - pulls up the help list for admins \n!bok test - test connection to bot \n!bok startScore - begins scoring members \n!bok <mee6 link> - sets up scoring link \n!bok kick <user> - temporary command that does nothing \n!bok siteClear - clears scoring link \n').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                } else {
                    msg.channel.send('You do not have admin permissions!').then(r => console.warn(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                }

                //Tom Tbomb easter egg
            } else if (msgContent === 'Tom') {
                msg.channel.send('Tbomb!').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);

                //starts scoring members on server (setup)
            } else if (msgContent === '!bok startScore') {
                if (isAdmin(msg)) {
                    msg.channel.send('Starting to score members').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                    getUserData(options, msg, rolesFile);
                } else {
                    msg.channel.send('You do not have admin permissions!').then(r => console.warn(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                }

            } else if (msgContent.startsWith('!bok role add')) {
                if (isAdmin(msg)) {
                    const args = msgContent.slice(0).split(' ');
                    roleLevel = parseFloat(args[4]);
                    let role = msg.mentions.roles.first().id;
                    if (typeof roleLevel != 'number' || isNaN(roleLevel)) {
                        msg.reply('that is an invalid role level! Please enter a number.').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                    } else if (role === undefined) {
                        msg.reply('that is an invalid role! Please mention a role.').then(r => console.warn(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                    } else {
                        roleLevel = Math.floor(roleLevel);
                        role = Math.floor(role);

                        createFile(rolesFile);
                        checkID(role, rolesFile);
                        fs.appendFileSync(rolesFile, role + ' ' + roleLevel + '\n');

                        msg.channel.send('The ' + role + ' role has been set to level ' + roleLevel).then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                    }
                } else {
                    msg.channel.send('You do not have admin permissions!').then(r => console.warn(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                }
            }
        }
    } catch (err) {
        console.error(err);
        msg.channel.send('An error occurred!').then(r => console.error(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
    }
});

function getUserData(options, msg, rolesFile) {
    const userData = [];
    rp(options)
        .then((data) => {
            for (let user of data.players) {
                userData.push([user.id, user.level]);
            }

            msg.channel.send('Updating roles').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error)
                .then(r => {
                    const contents = fs.readFileSync(rolesFile, 'utf8');
                    const lines = contents.split('\n');
                    const args = [];
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i] !== '') {
                            args.push(lines[i].split(' '));
                        }
                    }
                    for (let userInfo of userData) {
                        let memberId = userInfo[0];
                        if (memberId === undefined) {
                            continue;
                        }
                        let member = msg.guild.members.cache.get(memberId);
                        for (let arg of args) {
                            let roleLevel = Number(arg[1]);
                            let roleId = arg[0];
                            let role = msg.guild.roles.cache.find(role => role.id === roleId);
                            if (roleLevel === 0) {
                                if (member !== undefined) {
                                    member.roles.add(role).then(console.log('\t\tRole ' + role.id + ' given to ' + member.id));
                                }
                            } else if (Number(userInfo[1]) >= roleLevel) {
                                if (member !== undefined) {
                                    member.roles.add(role).then(console.log('\t\tRole ' + role.id + ' given to ' + member.id));
                                }
                            }
                        }
                    }
                })
                .then(r => {
                    msg.channel.send('Done setup. Use !bok help for help').then(r => console.log(`Sent message: \n\t${r.content.replace(/\r?\n|\r/g, '\n\t')}`)).catch(console.error);
                });
        })
        .catch((err) => {
            console.error(err);
        });
}

function isAdmin(msg) {
    return msg.member.hasPermission('ADMINISTRATOR');
}

function createFile(path) {
    if (fs.existsSync(path)) {

    } else {
        fs.appendFileSync(path, '');
    }
}

function checkID(IDnum, path) {
    createFile(path);
    const data = fs.readFileSync(path, 'utf8');
    const lines = data.split('\n');
    const allArgs = [];
    const IDs = [];
    for (let i = 0; i < lines.length; i++) {
        allArgs.push(lines[i].split(' '));
        IDs.push(allArgs[i][0]);
    }

    for (let i = 0; i < IDs.length; i++) {
        return IDnum === IDs[i];
    }
}

function ready(bot) {
    bot.user.setActivity('Star Wars', {type: 'WATCHING'}).then(r => console.log(r));
    console.info(`Logged in as ${bot.user.tag}`);
    bot.channels.cache.get('738439111412809730').send(':green_circle: Bot has started.')
}

function reboot() {
    bot.destroy();
    bot = new Discord.Client();
    bot.login(TOKEN).then(r => console.log('Used token: ' + r));
    bot.on('ready', () => {
        ready(bot)
    });
}