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
var settings = new Map();

class Settings {
    enabled;
    path;

    constructor(enabled, path) {
        this.enabled = enabled;
        this.path = path;
    }

    toString() {
        return this.enabled + '\n' + this.path;
    }

    get enabled() {
        return this.enabled;
    }

    set enabled(bool) {
        this.enabled = bool;
    }

    get path() {
        return this.path;
    }

    set path(str) {
        this.path = str;
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('a game');

    logMessage('Bot starting...');
    setup();
});

// Add guild owner to staff list when bot joins a new server
client.on('guildCreate', (guild) => {
    logMessage('Bot joined a new guild: ' + getGuildStr(guild));
    createDirectory('./data/' + guild.id).then(() => {
        loadStaff(guild);
        loadChannels(guild);
        loadSettings(guild);
    });
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
        if (!isApprovedChannel(message.guild, message.channel.id))
            return;
        // User checking loadorder
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
            if (isApprovedChannel(message.guild, message.channel.id)) {
                message.channel.send('<#' + message.channel.id + '> is already an approved channel');
                return;
            }

            addApprovedChannel(message.guild, message.channel.id).then(() => {
                message.channel.send('Added <#' + message.channel.id + '> to the list of approved channels');
            }).catch(() => {
                message.channel.send('Failed to add <#' + message.channel.id + '> to the list of approved channels, contact Robotic');
            });

        } else if (args[1] === 'remove') {
            if (!isApprovedChannel(message.guild, message.channel.id)) {
                message.channel.send('<#' + message.channel.id + '> is not an approved channel');
                return;
            }

            removeApprovedChannel(message.guild, message.channel.id).then(() => {
                message.channel.send('Removed <#' + message.channel.id + '> from the list of approved channels');
            }).catch(() => {
                message.channel.send('Failed to remove <#' + message.channel.id + '> from the list of approved channels, contact Robotic');
            });

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

            if (isStaff(message.guild, user.id)) {
                message.channel.send('That user is already staff');
                return;
            }

            addStaff(message.guild, user.id).then(() => {
                message.channel.send('Added ' + user.user.username + ' to the staff list');
            }).catch(() => {
                message.channel.send('Failed to add ' + user.user.username + ' to the staff list, contact Robotic');
            });

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

            if (user.id === message.author.id) {
                message.channel.send('You cannot remove yourself as staff');
                return;
            }

            if (!isStaff(message.guild, user.id)) {
                message.channel.send('That user is not staff');
                return;
            }

            removeStaff(message.guild, user.id).then(() => {
                message.channel.send('Removed ' + user.user.username + ' from the staff list');
            }).catch(() => {
                message.channel.send('Failed to remove ' + user.user.username + ' from the staff list, contact Robotic');
            });

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
        if (!isStaff(message.guild, message.author.id)) {
            return;
        }

        if (args.length === 1) {
            message.channel.send('Subcommands of `!loadorder file`:\n' +
                '`!loadorder file update [file]`: Updates the specified file\n' +
                '`!loadorder file archive [file]`: Archives the current specified file (rarely used)\n' +
                '`!loadorder file retrieve [file]`: Retrieves and sends the specified file in a discord message attachment\n\n' +
                'Possible files:\n' +
                fileTypes.toString());
            return;
        }

        if (!isValidFile(args[2])) {
            message.channel.send('Unknown file type: `' + args[2] + '`. Known files types:\n' +
                'loadorder\nskip\nreasons\nloot');
            return;
        }

        if (args[1] === 'update') {
            if (message.attachments.size !== 1) {
                message.channel.send('Message must contain exactly 1 attachment, got ' + message.attachments.size);
                return;
            }
            let attachment = message.attachments.first();
            let url = attachment.url;


            updateFile(message.guild, args[2], url).then(() => {
                message.channel.send('File has been sucessfully updated.');
                logMessage('The ' + args[2] + ' file has been updated in ' + getGuildStr(message.guild));
            }).catch((err) => {
                message.channel.send('Something went wrong trying to update the file, contact Robotic!');
                logMessage('FATAL: Something broke trying to update ' + args[2] + ' in ' + getGuildStr(message.guild));
                console.log(err);
            });
        } else if (args[1] === 'archive') {
            archiveIfNeeded(message.guild, args[2]).then(() => {
                message.channel.send('The ' + args[2] + ' file has been successfully archived.');
                logMessage('The ' + args[2] + ' file has been archived in ' + getGuildStr(message.guild));
            })
        }
    }
});

function setup() {
    client.guilds.cache.forEach((guild) => {
        createDirectory('./data/' + guild.id).then(() => {
            loadChannels(guild).catch((err) => {
                logMessage('Error: Failed to load channels for ' + getGuildStr(guild) + '\n' + err);
                console.log(err);
            });
            loadStaff(guild).catch((err) => {
                logMessage('Error: Failed to load staff for ' + getGuildStr(guild) + '\n' + err);
                console.log(err);
            });
            loadSettings(guild).catch((err) => {
                logMessage('Error: Failed to load settings for ' + getGuildStr(guild) + '\n' + err);
                console.log(err);
            });
        });
    });
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
    return fs.promises.access(filePath, fs.constants.F_OK).then(() => archiveFile(guild, fileType)).catch(() => { });
}

async function archiveFile(guild, fileType) {
    let folder = './data/' + guild.id + '/archive/' + fileType;
    let filePath = './data/' + guild.id + '/' + getFileNameFromFileType(fileType);

    await createDirectory(folder);
    let stats = await fs.promises.stat(filePath);
    let time = stats.mtime.toDateString().replace(/ /g, '_');
    return fs.promises.rename(filePath, folder + '/' + fileType + '_' + time + getExtensionFromFileType(fileType));
}

async function addApprovedChannel(guild, channelID) {
    let guildChannels = approvedChannels.get(guild.id);
    guildChannels.push(channelID);
    approvedChannels.set(guild.id, guildChannels);
    return new Promise((resolve, reject) => {
        saveChannels(guild).then(() => {
            logMessage(getChannelStr(getChannel(channelID)) + ' added as an approved channel');
            resolve();
        }).catch((err) => {
            logMessage('Error: Failed to save adding ' + getChannelStr(getChannel(channelID)) + ' as an approved channel\n' + err);
            console.log(err);
            reject();
        });
    });
}

async function removeApprovedChannel(guild, channelID) {
    let guildChannels = approvedChannels.get(guild.id);
    guildChannels.splice(guildChannels.indexOf(channelID), 1);
    approvedChannels.set(guild.id, guildChannels);
    return new Promise((resolve, reject) => {
        saveChannels(guild).then(() => {
            logMessage(getChannelStr(getChannel(channelID)) + ' removed as an approved channel');
            resolve();
        }).catch((err) => {
            logMessage('Error: Failed to save removing ' + getChannelStr(getChannel(channelID)) + ' as an approved channel\n' + err);
            console.log(err);
            reject();
        });
    });
}

function isApprovedChannel(guild, channelID) {
    let guildChannels = approvedChannels.get(guild.id);
    return guildChannels.includes(channelID);
}

async function addStaff(guild, userID) {
    let guildStaff = staffUsers.get(guild.id);
    guildStaff.push(userID);
    staffUsers.set(guild.id, guildStaff);
    return new Promise((resolve, reject) => {
        saveStaff(guild).then(() => {
            logMessage(getMemberStrFromId(guild, userID) + ' added as a staff member');
            resolve();
        }).catch((err) => {
            logMessage('Error: Failed to save adding ' + getMemberStrFromId(guild, userID) + ' as a staff member\n' + err);
            console.log(err);
            reject();
        });
    });
}

async function removeStaff(guild, userID) {
    let guildStaff = staffUsers.get(guild.id);
    guildStaff.splice(guildStaff.indexOf(userID), 1);
    staffUsers.set(guild.id, guildStaff);
    return new Promise((resolve, reject) => {
        saveStaff(guild).then(() => {
            logMessage(getMemberStrFromId(guild, userID) + ' removed as a staff member');
            resolve();
        }).catch((err) => {
            logMessage('Error: Failed to save removing ' + getMemberStrFromId(guild, userID) + ' as a staff member\n' + err);
            console.log(err);
            reject();
        });
    });
}



async function createDirectory(path) {
    return fs.promises.mkdir(path, { recursive: true });
}

async function loadChannels(guild) {
    return fs.promises.readFile('./data/' + guild.id + '/channels.dat', 'utf8').then((data) => {
        let guildChannels = [];
        data.split(',').forEach((userID) => {
            guildChannels.push(userID);
        });
        approvedChannels.set(guild.id, guildChannels);
        logMessage('Loaded approved channels from ' + getGuildStr(guild) + ' to memory');
    }).catch(() => {
        approvedChannels.set(guild.id, [guild.ownerID]);
        saveChannels(guild).then(() => {
            logMessage('Saved approvedChannels for ' + getGuildStr(guild));
        }).catch((err) => {
            logMessage('Error: Failed to save approvedChannels for ' + getGuildStr(guild) + '\n' + err);
            console.log(err);
        });
    })
}

async function loadStaff(guild) {
    return fs.promises.readFile('./data/' + guild.id + '/staff.dat', 'utf8').then((data) => {
        let guildStaff = [];
        data.split(',').forEach((userID) => {
            guildStaff.push(userID);
        });
        staffUsers.set(guild.id, guildStaff);
        logMessage('Loaded staff members from ' + getGuildStr(guild) + ' to memory');
    }).catch(() => {
        staffUsers.set(guild.id, [guild.ownerID]);
        saveStaff(guild).then(() => {
            logMessage('Saved staff for ' + getGuildStr(guild));
        }).catch((err) => {
            logMessage('Error: Failed to save staffUsers for ' + getGuildStr(guild) + '\n' + err);
            console.log(err);
        });
    })
}

async function loadSettings(guild) {
    return fs.promises.readFile('./data/' + guild.id + '/settings.dat', 'utf8').then((data) => {
        let lines = data.toString().split(/\r?\n/);
        settings.set(guild.id, new Settings(lines[0], lines[1]));
        logMessage('Loaded settings for ' + getGuildStr(guild) + ' to memory');
    }).catch(() => {
        settings.set(guild.id, new Settings(true, 'MO2/profiles/[profile]/loadorder.txt'));
        saveSettings(guild).then(() => {
            logMessage('Created new settings for ' + getGuildStr(guild));
        }).catch((err) => {
            logMessage('Error: Failed to save settings for ' + getGuildStr(guild) + '\n' + err);
            console.log(err);
        });
    });
}

async function saveChannels(guild) {
    return fs.promises.writeFile('./data/' + guild.id + '/channels.dat', Array.from(approvedChannels.get(guild.id)).toString());
}

async function saveStaff(guild) {
    return fs.promises.writeFile('./data/' + guild.id + '/staff.dat', Array.from(staffUsers.get(guild.id)).toString());
}

async function saveSettings(guild) {
    return fs.promises.writeFile('./data/' + guild.id + '/settings.dat', settings.get(guild.id).toString());
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
    return '`MB:' + nick + '(`' + getUserStr(user) + '` / `' + getGuildStr(guild) + '`)`';
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
