require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const https = require('https');

const token = process.env.BOT_TOKEN;
const logChannel = '765326262616719366';
const fileTypes = ['loadorder', 'skip', 'reasons', 'loot'];

var staffUsers = new Map();
var approvedChannels = new Map();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('a game');

    logMessage('Bot starting...');
    setup();
});

// Add guild owner to staff list when bot joins a new server
client.on('guildCreate', (guild) => {
    logMessage('Bot joined a new guild: ' + getGuildStr(guild));
    staffUsers.set(guild.id, [guild.ownerID]);
    createDirectory('./data/' + guild.id);
    saveStaff(guild);
});

client.on('message', async (message) => {
    // Disallow DMs to bot
    if (message.guild === null) {
        return;
    }

    if (!message.content.startsWith('!loadorder')) {
        return;
    }

    let args = message.content.split(' ');
    if (args.length === 1) {
        message.channel.send('TODO: Add help message');
        return;
    }
    args = args.slice(1, args.length);

    if (args[0] === 'channel') {
        if (!isStaff(message.guild, message.author.id)) {
            return;
        }
        if (args.length === 1) {
            message.channel.send('Subcommands of `!loadorder channel`:\n' +
                '`!loadorder channel add` - Adds this channel to list of approved channels\n' +
                '`!loadorder channel remove` - Removes this channel from list of approved channels\n' +
                '`!loadorder channel status` - Says if channel is currently approved or not\n' +
                '`!loadorder channel list` - Lists approved channels');
            return;
        }

        if (args[1] === 'add') {
            addApprovedChannel(message.guild, message.channel.id);
            message.channel.send('Added <#' + message.channel.id + '> to the list of approved channels.');
        } else if (args[1] === 'remove') {
            removeApprovedChannel(message.guild, message.channel.id);
            message.channel.send('Removed <#' + message.channel.id + '> from the list of approved channels.');
        } else if (args[1] === 'status') {
            message.channel.send('<#' + message.channel.id + '> is' + (isApprovedChannel(message.guild, message.channel.id) ? '' : ' not') + ' an approved channel');
        } else if (args[1] === 'list') {
            let response = 'List of approved channels:\n';
            // Loop through approvedChannels, adding each one that's in the same guild as the sent command to the output
            approvedChannels.forEach((channels, guild) => {
                if (guild === message.guild.id) {
                    channels.forEach((channelID) => {
                        response += '<#' + channelID + '>\n';
                    });
                }
            });
            message.channel.send(response);
        } else {
            message.channel.send('Subcommands of `!loadorder channel`:\n' +
                '`!loadorder channel add` - Adds this channel to list of approved channels\n' +
                '`!loadorder channel remove` - Removes this channel from list of approved channels\n' +
                '`!loadorder channel status` - Says if channel is currently approved or not\n' +
                '`!loadorder channel list` - Lists approved channels');
        }
    } else if (args[0] === 'staff') {
        if (!isStaff(message.guild, message.author.id)) {
            return;
        }

        if (args.length === 1) {
            message.channel.send('Subcommands of `!loadorder staff`:\n' +
                '`!loadorder staff add <user>` - Sets the given user as staff for the server\n' +
                '`!loadorder staff remove <user>` - Removes staff from the given user for the server\n' +
                '`!loadorder staff list` - Lists the staff in the server');
            return;
        }

        if (args[1] === 'add') {
            if (message.mentions.members.array().length != 1) {
                message.channel.send('This command must ping (mention) exactly 1 user, found ' + message.mentions.members.array().length);
                return;
            }
            let user = message.mentions.members.first();
            addStaff(message.guild, user.id);
            message.channel.send('Added ' + user.user.username + ' to the staff list');
        } else if (args[1] === 'remove') {
            if (message.mentions.members.array().length != 1) {
                message.channel.send('This command must ping (mention) exactly 1 user, found ' + message.mentions.members.array().length);
                return;
            }
            let user = message.mentions.members.first();
            if (user.id === message.guild.ownerID) {
                message.channel.send('That user cannot be removed from staff, they are the server owner');
                return;
            }
            removeStaff(message.guild, user.id);
            message.channel.send('Removed ' + user.user.username + ' from the staff list');
        } else if (args[1] === 'list') {
            let response = 'List of staff members:\n';
            // Loop through staffUsers, adding each one that's in the same guild as the sent command to the output
            staffUsers.forEach((users, guild) => {
                if (guild === message.guild.id) {
                    // guilds are keys, users are values (in an array)
                    // get the proper guild, then loop through the users in the array
                    users.forEach((userID) => {
                        // Convert from developer ID to username and tag (i.e. Robotic#1111)
                        let userObj = client.users.cache.get(userID);
                        response += userObj.username + '#' + userObj.discriminator + ' (' + userID + ')\n';
                    });
                }
            });
            message.channel.send(response);
        } else {
            message.channel.send('Subcommands of `!loadorder staff`:\n' +
                '`!loadorder staff add <user>` - Sets the given user as staff for the server\n' +
                '`!loadorder staff remove <user>` - Removes staff from the given user for the server\n' +
                '`!loadorder staff list` - Lists the staff in the server');
        }
    } else if (args[0] === 'file') {
        if (args.length === 1) {
            message.channel.send('Subcommands of `!loadorder file`:\n' +
                '`!loadorder file [file] update`: Updates the specified file\n' +
                '`!loadorder file [file] archive`: Archives the current specified file (rarely used)\n' +
                '`!loadorder file [file] retrieve`: Retrieves and sends the specified file in a discord message attachment\n\n' +
                'Possible files:\n' +
                fileTypes.toString());
            return;
        }

        if (!isValidFile(args[1])) {
            message.channel.send('Unknown file type: `' + args[1] + '`. Known files types:\n' +
                'loadorder\nskip\nreasons\nloot');
            return;
        }

        if (args[2] === 'update') {
            if (message.attachments.size !== 1) {
                message.channel.send('Message must contain exactly 1 attachment, got ' + message.attachments.size);
                return;
            }
            let attachment = message.attachments.first();
            let url = attachment.url;

            
            updateFile(message.guild, args[1], url).then(() => {
                message.channel.send('File has been sucessfully updated.');
                logMessage('The ' + args[1] + ' file has been updated in ' + getGuildStr(message.guild));
            }).catch((err) => {
                message.channel.send('Something went wrong trying to update the file, contact Robotic!');
                logMessage('FATAL: Something broke trying to update ' + args[1] + ' in ' + getGuildStr(message.guild));
                console.log(err);
            });
        } else if (args[2] === 'archive') {
            archiveIfNeeded(message.guild, args[1]).then(() => {
                message.channel.send('The ' + args[1] + ' file has been successfully archived.');
                logMessage('The ' + args[1] + ' file has been archived in ' + getGuildStr(message.guild));
            })
        }
    }

    // User commands, only allowed in approved channels
    if (!isApprovedChannel(message.guild, message.channel.id)) {
        return;
    }
});

async function updateFile(guild, fileType, url) {
    await archiveIfNeeded(guild, fileType);
    let file = fs.createWriteStream('./data/' + guild.id + '/' + getFileNameFromFileType(fileType));
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            response.on('error', (err) => {
                reject(err);
            });
            response.pipe(file);
            resolve();
        });
    });
}

async function archiveIfNeeded(guild, fileType) {
    let filePath = './data/' + guild.id + '/' + getFileNameFromFileType(fileType);
    return fs.promises.access(filePath, fs.constants.F_OK).then(() => archiveFile(guild, fileType)).catch(() => {});
}

async function archiveFile(guild, fileType) {
    let folder = './data/' + guild.id + '/archive/' + fileType;
    let filePath = './data/' + guild.id + '/' + getFileNameFromFileType(fileType);

    await createDirectory(folder);
    let stats = await fs.promises.stat(filePath);
    let time = stats.mtime.toDateString().replace(/ /g, '_');
    return fs.promises.rename(filePath, folder + '/' + fileType + '_' + time + getExtensionFromFileType(fileType));
}

function addApprovedChannel(guild, channelID) {
    let guildChannels = approvedChannels.get(guild.id);
    guildChannels.push(channelID);
    approvedChannels.set(guild.id, guildChannels);
    logMessage(getChannelStr(getChannel(channelID)) + ' added as an approved channel.');
    saveChannels(guild);
}

function removeApprovedChannel(guild, channelID) {
    let guildChannels = approvedChannels.get(guild.id);
    guildChannels.splice(guildChannels.indexOf(channelID), 1);
    approvedChannels.set(guild.id, guildChannels);
    logMessage(getChannelStr(getChannel(channelID)) + ' removed as an approved channel.');
    saveChannels(guild);
}

function isApprovedChannel(guild, channelID) {
    let guildChannels = approvedChannels.get(guild.id);
    return guildChannels.includes(channelID);
}

function addStaff(guild, userID) {
    let guildStaff = staffUsers.get(guild.id);
    guildStaff.push(userID);
    staffUsers.set(guild.id, guildStaff);
    logMessage(getMemberStrFromId(guild, userID) + ' added as a staff member.');
    saveStaff(guild);
}

function removeStaff(guild, userID) {
    let guildStaff = staffUsers.get(guild.id);
    guildStaff.splice(guildStaff.indexOf(userID), 1);
    staffUsers.set(guild.id, guildStaff);
    logMessage(getMemberStrFromId(guild, userID) + ' removed as a staff member.');
    saveStaff(guild);
}

function isStaff(guild, userID) {
    let guildStaff = staffUsers.get(guild.id);
    return guildStaff.includes(userID);
}

function isInGuild(guild, channelID) {
    return guild.channels.cache.get(channelID) !== undefined;
}

function isValidFile(fileType) {
    return fileTypes.includes(fileType);
}

function setup() {
    client.guilds.cache.forEach((guild) => {
        createDirectory('./data/' + guild.id).then(() => {
            loadChannels(guild);
            loadStaff(guild);
        });
    });
}

async function createDirectory(path) {
    return fs.promises.mkdir(path, { recursive: true });
}

function loadChannels(guild) {
    // Try to access the channels file for the guild
    fs.access('./data/' + guild.id + '/channels.dat', fs.constants.F_OK, (err) => {
        // If it errors, there's no file, set an empty one
        if (err) {
            approvedChannels.set(guild.id, []);
            saveChannels(guild);
            return;
        }
        // Now try to read the file
        fs.readFile('./data/' + guild.id + '/channels.dat', 'utf8', (err, data) => {
            if (err) {
                logMessage('Error: could not read `./data/' + guild.id + '/channels.dat`: \n' + err);
                console.log('Error: could not read \'./data/' + guild.id + '/channels.dat\'');
            } else {
                // Split file by comma, create a new list and add to Map
                let guildChannels = [];
                data.split(',').forEach((channelID) => {
                    if (channelID !== '')
                        guildChannels.push(channelID);
                });
                approvedChannels.set(guild.id, guildChannels);
                logMessage('Loaded approved channels from ' + getGuildStr(guild) + ' to memory');
            }
        });
    });
}

function loadStaff(guild) {
    // Try to access the staff file for the guild
    fs.access('./data/' + guild.id + '/staff.dat', fs.constants.F_OK, (err) => {
        // If it errors there's no file and we need to populate with the server owner and save it
        if (err) {
            staffUsers.set(guild.id, [guild.ownerID]);
            saveStaff(guild);
        } else {
            // Now try to read the file
            fs.readFile('./data/' + guild.id + '/staff.dat', 'utf8', (err, data) => {
                if (err) {
                    logMessage('Error: could not read `./data/' + guild.id + '/staff.dat`: \n' + err);
                    console.log('Error: could not read \'./data/' + guild.id + '/staff.dat\'');
                } else {
                    // Split file by comma, create a new list and add to Map
                    let guildStaff = [];
                    data.split(',').forEach((userID) => {
                        guildStaff.push(userID);
                    });
                    staffUsers.set(guild.id, guildStaff);
                    logMessage('Loaded staff members from ' + getGuildStr(guild) + ' to memory');
                }
            });
        }
    });
}

function saveChannels(guild) {
    // Get the array value connected to the guild id key
    // Turn it to a string, write it to file
    fs.writeFile('./data/' + guild.id + '/channels.dat', Array.from(approvedChannels.get(guild.id)).toString(), (err) => {
        if (err) {
            logMessage('Error: could not write approvedChannels to `./data/' + guild.id + '/channels.dat`\n' + err);
            console.log('Error: could not write approvedChannels to \'./data/' + guild.id + '/channels.dat\'\n' + err);
        } else {
            logMessage('Wrote approvedChannels to `./data/' + guild.id + '/channels.dat`');
        }
    });
}

function saveStaff(guild) {
    // Get the array value connected to the guild id key
    // Turn it to a string, write it to file
    fs.writeFile('./data/' + guild.id + '/staff.dat', Array.from(staffUsers.get(guild.id)).toString(), (err) => {
        if (err) {
            logMessage('Error: could not write staffUsers to `./data/' + guild.id + '/staff.dat`\n' + err);
            console.log('Error: could not write staffUsers to \'./data/' + guild.id + 'staff.dat\'\n' + err);
        } else {
            logMessage('Wrote staffUsers to `./data/' + guild.id + '/staff.dat`');
        }
    });
}

function logMessage(msg) {
    getChannel(logChannel).send(msg);
}

function getGuildStr(guild) {
    return '`G:' + guild.name + '(' + guild.id + ')`';
}

function getChannel(id) {
    return client.channels.cache.get(id);
}

function getChannelStr(channel) {
    let type = channel.type;
    let ret = '`';
    if (type === 'text')
        ret += 'TC';
    else if (type === 'voice')
        ret += 'VC';
    else if (type === 'dm')
        ret += 'DM';
    else if (type === 'news')
        ret += 'NC';
    else
        ret += 'C';
    
    ret += ':' + channel.name + '(' + channel.id + ') / ' + getGuildStr(channel.guild) + '`';
    return ret;
}

function getMember(guild, id) {
    return guild.members.cache.get(id);
}

function getUserStr(user) {
    return '`U:' + user.username + '(' + user.id + ')`';
}

function getMemberStr(member) {
    let guild = member.guild;
    let user = member.user;
    let nick = member.nickname;
    if (nick === null)
        nick = user.username;
    return '`MB:' + nick + '(' + getUserStr(user) + ' / ' + getGuildStr(guild) + ')`';
}

function getMemberStrFromId(guild, id) {
    return getMemberStr(getMember(guild, id));
}

function getFileNameFromFileType(fileType) {
    if (fileType === 'loadorder')
        return 'loadorder.txt';
    else if (fileType === 'skips')
        return 'skips.txt';
    else if (fileType === 'loot')
        return 'userlist.yaml';
    else if (fileType === 'reasons')
        return 'reasons.json';
    return null;
}

function getExtensionFromFileType(fileType) {
    if (fileType === 'loadorder' || fileType === 'skips')
        return '.txt';
    else if (fileType === 'loot')
        return '.yaml';
    else if (fileType === 'reasons')
        return '.json';
    return null;
}

client.login(token);
