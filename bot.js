const discord = require('discord.js');
const client = new discord.Client();
const userCreatedPolls = new Map();
const { Client, MessageEmbed } = require('discord.js');

client.login('NzEwMDI4MzMxMDIxNzYyNTgw.XsjPTw.LYj-3PRfYwDoWEyYW54CTAmAPsg');
client.on('ready', () => {
    console.log(client.user.tag + " has logged in.");
    client.user.setActivity('Prefix: k!; Type k!help to know the commands.');
});

client.on('message', message => {
    if(message.author.bot) return;

    if(message.content.toLowerCase() === 'k!help') {
        const embed = new MessageEmbed()
        .setTitle('Commnads')
        .setColor(0x677FF7)
        .setDescription('Help command triggered')
        .addFields(
            {name: 'k!createpoll', value: 'This starts the polling process.'},
            {name: 'k!done', value: 'Type this command to stop the bot from taking any more poll options.'},
            {name: 'k!stopvote', value: 'This command stops the poll process early, default time period for the poll to stop is 24 hrs.'},
        )
        .setFooter('Kitt poll bot.');
    return message.author.send(embed);
   };
});

client.on('message', async message => {
    if(message.author.bot) return;
    if(message.content.toLowerCase() === 'k!createpoll') {
        if(userCreatedPolls.has(message.author.id)) {
            message.channel.send("You already have a poll going on right now.");
            return;
        }
        message.channel.send("Enter options. Max 20. Type k!done when finished.");
        let filter = m => {
            if(m.author.id === message.author.id) {
                if(m.content.toLowerCase() === 'k!done') collector.stop();
                else return true;
            }
            else return false;
        }
        let collector = message.channel.createMessageCollector(filter, { maxMatches: 20 });
        let pollOptions = await getPollOptions(collector);
        if(pollOptions.length < 2) {
            message.channel.send("Not enough options, must contain 2!");
            return;
        }
        let embed = new discord.MessageEmbed();
        embed.setColor(0x88fdfd);
        embed.setTitle("Your Poll");
        embed.setDescription(pollOptions.join("\n"));
        let confirm = await message.channel.send(embed);
        
        await confirm.react('✅');
        await confirm.react('❎');

        let reactionFilter = (reaction, user) => (user.id === message.author.id) && !user.bot;
        let reaction = (await confirm.awaitReactions(reactionFilter, { max: 1 })).first();
        if(reaction.emoji.name === '✅') {
            message.channel.send("Poll will begin in 5 seconds.");
            await delay(5000);
            message.channel.send("Vote now!");
            let userVotes = new Map();
            let pollTally = new discord.Collection(pollOptions.map(o => [o, 0]));
            let pollFilter = m => !m.bot;
            let voteCollector = message.channel.createMessageCollector(pollFilter, {
                time: 8640000
            });
            userCreatedPolls.set(message.author.id, voteCollector);
            await processPollResults(voteCollector, pollOptions, userVotes, pollTally);
            let max = Math.max(...pollTally.array());
            console.log(pollTally.entries());
            let entries = [...pollTally.entries()];
            let winners = [];
            let embed = new discord.MessageEmbed();
            let desc = '';
            entries.forEach(entry => entry[1] === max ? winners.push(entry[0]) : null);
            entries.forEach(entry => desc  += entry[0] + " received " + entry[1] + " votes(s)\n");
            embed.setColor(0x88fdfd);
            embed.setDescription(desc);

            if(winners.length === 1) {
                message.channel.send(winners[0] + " is the winner!", embed);
            }
            else {
                message.channel.send("We have a draw!", embed);
            }
        }   
        else if(reaction.emoji.name === '❎') {
            message.channel.send("Poll cancelled.");
        }
    }
    else if(message.content.toLowerCase() === 'k!stopvote') {
        if(userCreatedPolls.has(message.author.id)) {
            console.log("Trying to stop poll.");
            userCreatedPolls.get(message.author.id).stop();
            userCreatedPolls.delete(message.author.id);
        }
        else {
            message.channel.send("You don't have a poll going on right now.");
        }
    }
});

function processPollResults(voteCollector, pollOptions, userVotes, pollTally) {
    return new Promise((resolve, reject) => {
        voteCollector.on('collect', msg => {
            let option = msg.content.toLowerCase();
            if(!userVotes.has(msg.author.id) && pollOptions.includes(option)) {
                userVotes.set(msg.author.id, msg.content);
                let voteCount = pollTally.get(option);
                pollTally.set(option, ++voteCount);
            }
        });
        voteCollector.on('end', collected => {
            console.log("Collected " + collected.size + " votes.");
            resolve(collected);
        })
    });
}

function getPollOptions(collector) {
    return new Promise((resolve, reject) => {
        collector.on('end', collected => resolve(collected.map(m => m.content.toLowerCase())));
    });
}

function delay(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time)
    })
}
