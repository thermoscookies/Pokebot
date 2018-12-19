const Discord=require('discord.js');

module.exports.run = async (MAIN, message, args, prefix) => {

  // DECLARE VARIABLES
  let pokemon_sub = '', subscriptions = '', nickname = '';

  // GET USER NICKNAME
  if(message.member.nickname){ nickname = message.member.nickname; } else{ nickname = message.member.user.username; }

  // DEFINE THE SUBSCRIPTION
  let sub = {};
  let action = await action_collector(nickname,message, undefined,'Names are not case-sensitive.');
  switch(action){
    case 'create':

    case 'remove':

    case 'modify':
  }

}

function sub_collector(type,nickname,message,pokemon,requirements){
  return new Promise(function(resolve, reject) {

    // DELCARE VARIABLES
    let timeout = true, instruction = '';

    // DEFINE COLLECTOR AND FILTER
    const filter = cMessage => cMessage.member.id==message.member.id;
    const collector = message.channel.createMessageCollector(filter, { time: 120000 });

    if(type == 'Name'){
      instruction = new Discord.RichEmbed().setColor('00ff00')
        .setAuthor(nickname, message.member.user.displayAvatarURL)
        .setTitle('Pokémon Subscription Start')
        .setDescription('What Pokémon would you like to Subscribe to?')
        .setFooter(requirements);
    }
    else{
      instruction = new Discord.RichEmbed().setColor('00ff00')
        .setAuthor(nickname, message.member.user.displayAvatarURL)
        .setTitle(pokemon+' Subscription Setup')
        .setDescription('What **'+type+'** would like you like to set for **'+pokemon+'** Notifications?')
        .setFooter(requirements);
    }

    let completeSub = new Discord.RichEmbed().setColor('00ff00')
      .setAuthor(nickname, message.member.user.displayAvatarURL)
      .setTitle(pokemon+' Subscription Complete!');

    let timeoutSub = new Discord.RichEmbed().setColor('00ff00')
      .setAuthor(nickname, message.member.user.displayAvatarURL)
      .setTitle(pokemon+' Subscription Has Timed Out!')
      .setFooter('You can start a new sub with the \'pokemon\' command.');

    message.channel.send(instruction).catch(console.error).then( msg => {

      let input = '';

      // FILTER COLLECT EVENT
      collector.on('collect', message => {

        let timeoutSub = new Discord.RichEmbed().setColor('00ff00')
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle();

        switch(true){

          case message.content.toLowerCase() == 'cancel':
            message.reply('Cancelling Sub.')
              .then(m => { m.delete(5000); msg.delete(); return; }).catch(console.error);

          // POKEMON NAME
          case type.indexOf('Name')>=0:
            for(let p = 1;p < 723;p++){
              if(args[0].toLowerCase() == MAIN.pokemon[p].name.toLowerCase()){
                msg.delete(); resolve(message.content);  collector.stop('complete'); break;
              }
              else if(p == 722){
                message.reply('That doesn\'t appear to be a valid Pokémon name. Please check the spelling and try again.').then(m => m.delete(5000)).catch(console.error);
              }
            }

          // CP CONFIGURATION
          case type.indexOf('CP')>=0:
            if(parseInt(message.content) > 0 || message.content.toLowerCase() == 'all'){
              message.reply('`'+type+'` setting for `'+pokemon+'` has been set to `'+message.content+'`.')
                .then(m => { m.delete(5000); resolve(message.content); collector.stop(); msg.delete(); }).catch(console.error);
              }
            else{ message.reply('Invalid Input. '+requirements).then(m => m.delete(5000)).catch(console.error); msg.delete(); } break;

          // MIN/MAX IV CONFIGURATION
          case type.indexOf('IV')>=0:
            if(parseInt(message.content) >= 0 && parseInt(message.content) <= 100){
              message.reply('`'+type+'` setting for `'+pokemon+'` has been set to `'+message.content+'`.')
                .then(m => { m.delete(5000); resolve(message.content); collector.stop(); msg.delete();  }).catch(console.error);
            }
            else if(message.content.length == 8 || message.content.toLowerCase() == 'all'){
              message.reply('`'+type+'` setting for `'+pokemon+'` has been set to `'+message.content+'`.')
                .then(m => { m.delete(5000); resolve(message.content); collector.stop(); msg.delete();  }).catch(console.error);
            }
            else{ message.reply('Invalid Input. '+requirements).then(m => m.delete(5000)).catch(console.error); msg.delete(); } break;

          // MIN/MAX LEVEL CONFIGURATION
          case type.indexOf('Level')>=0:
            if(parseInt(message.content) >= 0 && parseInt(message.content) <= 35){
              message.reply('`'+type+'` setting for `'+pokemon+'` has been set to `'+message.content+'`.')
                .then(m => { m.delete(5000); resolve(message.content); collector.stop(); msg.delete(); }).catch(console.error);
            }
            else if(message.content.toLowerCase() == 'all'){
              message.reply('`'+type+'` setting for `'+pokemon+'` has been set to `'+message.content+'`.')
                .then(m => { m.delete(5000); resolve(message.content); collector.stop(); msg.delete(); }).catch(console.error);
            }
            else{ message.reply('Invalid Input. '+requirements).then(m => m.delete(5000)).catch(console.error); msg.delete(); } break;


          // GENDER CONFIGURATION
          case type.indexOf('Gender')>=0:
            if(message.content.toLowerCase() == 'all' || message.content.toLowerCase() == 'male' || message.content.toLowerCase() == 'female'){
              msg.delete(); collector.stop('complete'); resolve(message.content);
            }
            else{ message.reply('Invalid Input. '+requirements).then(m => m.delete(5000)).catch(console.error); msg.delete(); } break;


          case type.indexOf('confirm')>=0:
            if(message.content.toLowerCase() == 'all' || message.content.toLowerCase() == 'male' || message.content.toLowerCase() == 'female'){
              msg.delete(); collector.stop('complete'); resolve(message.content);
            }
            else{ message.reply('Invalid Input. '+requirements).then(m => m.delete(5000)).catch(console.error); msg.delete(); } break;


        }
        // collector.on('collect', (collected,reason) => {
        //   if(reason){
        //     console.log(reason);
        //   }
        // });
      });
    });
  });
}

async function subscription_create(){

  sub.name = await sub_collector('Name',nickname,message, undefined,'Names are not case-sensitive.');
  sub.min_cp = await sub_collector('Minimum CP',nickname,message,sub.name,'Please respond with a number greater than 0 or \'All\'. Type \'Cancel\' to Stop.');
  sub.max_cp = await sub_collector('Maximum CP',nickname,message,sub.name,'Please respond with a number greater than 0 or \'All\'. Type \'Cancel\' to Stop.');
  sub.min_iv = await sub_collector('Minimum IV',nickname,message,sub.name,'Please respond with a IV number between 0 and 100, specify minimum Atk/Def/Sta (15/14/13) Values or type \'All\'. Type \'Cancel\' to Stop.');
  sub.min_lvl = await sub_collector('Minimum Level',nickname,message,sub.name,'Please respond with a value between 0 and 35 or type \'All\'. Type \'Cancel\' to Stop.');
  sub.max_lvl = await sub_collector('Maximum Level',nickname,message,sub.name,'Please respond with a value between 0 and 35 or type \'All\'. Type \'Cancel\' to Stop.');
  sub.gender = await sub_collector('Gender',nickname,message,sub.name,'Please respond with \'Male\' or \'Female\' or type \'All\'.');
  let confirm = await sub_collector('Confirm',nickname,message,sub.name,'Type \'Yes\' or \'No\'. Subscription will be saved.');

  MAIN.database.query("SELECT * FROM pokebot.users WHERE user_id = ?", [message.member.id], function (error, user, fields) {
    console.log(user[0]);
    if(!user[0].pokemon){
      console.log('Creating new Sub');
      pokemon_sub = {};
      pokemon_sub.subscriptions = [];
      pokemon_sub.subscriptions.push(sub);
    }
    else{
      console.log('Found existing Sub');
      pokemon_sub = JSON.parse(user[0].pokemon);
      pokemon_sub.subscriptions.push(sub);
    }
    console.log(pokemon_sub);
    MAIN.database.query("UPDATE pokebot.users SET pokemon = ? WHERE user_id = ?", [pokemon_sub,message.member.id], function (error, user, fields) {
      if(error){ return message.reply('There has been an error, please contact an Admin to fix.').then(m => m.delete(10000)).catch(console.error); }
      else{
        let subscription_success = new Discord.RichEmbed()
          .setColor('00ff00')
          .addField('Pokémon Subscription Command:', '`'+prefix+'pokemon [Pokémon Name]`\nThis command begins the filter setting process.')
          .setFooter('Type \'Cancel\' to cancel the subscription process.');
        return message.channel.send(subscription_success).then(m => m.delete(60000)).catch(console.error);
      }
    });
  });
}