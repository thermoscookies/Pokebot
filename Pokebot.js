// MODULE REQUIREMENTS
const fs = require('fs');
const ini = require('ini');
const mysql = require('mysql');
const moment = require('moment');
const ontime = require('ontime');
const express = require('express');
const Discord = require('discord.js');
const StaticMaps = require('staticmaps');
const bodyParser = require('body-parser');
const insideGeofence = require('point-in-polygon');
const insideGeojson = require('point-in-geopolygon');

// EVENTS TO DISABLE TO SAVE MEMORY AND CPU
var eventsToDisable = ['channelCreate','channelDelete','channelPinsUpdate','channelUpdate','clientUserGuildSettingsUpdate','clientUserSettingsUpdate',
  'debug','disconnect','emojiCreate','emojiDelete','emojiUpdate','guildBanAdd','guildBanRemove','guildCreate','guildDelete','guildMemberAdd',
  'guildMemberAvailable','guildMembersChunk','guildMemberSpeaking','guildMemberUpdate','guildUnavailable','guildUpdate','messageDelete',
  'messageDeleteBulk','messageReactionAdd','messageReactionRemove','messageReactionRemoveAll','messageUpdate','presenceUpdate','ready',
  'reconnecting','resume','roleCreate','roleDelete','roleUpdate','typingStart','typingStop','userNoteUpdate','userUpdate','voiceStateUpdate','warn'];

// DEFINE BOTS AND DISABLE ALL EVENTS TO SAVE MEMORY AND CPU
const MAIN = new Discord.Client({ disabledEvents: eventsToDisable }); const ALPHA=new Discord.Client({ disabledEvents: eventsToDisable });
const BRAVO = new Discord.Client({ disabledEvents: eventsToDisable }); const CHARLIE=new Discord.Client({ disabledEvents: eventsToDisable });
const DELTA = new Discord.Client({ disabledEvents: eventsToDisable }); const ECHO=new Discord.Client({ disabledEvents: eventsToDisable });
const FOXTROT = new Discord.Client({ disabledEvents: eventsToDisable }); const GULF=new Discord.Client({ disabledEvents: eventsToDisable });
const HOTEL = new Discord.Client({ disabledEvents: eventsToDisable }); const INDIA=new Discord.Client({ disabledEvents: eventsToDisable });
const JULIET = new Discord.Client({ disabledEvents: eventsToDisable }); const KILO=new Discord.Client({ disabledEvents: eventsToDisable });
const LIMA = new Discord.Client({ disabledEvents: eventsToDisable }); const MIKE=new Discord.Client({ disabledEvents: eventsToDisable });
const NOVEMBER = new Discord.Client({ disabledEvents: eventsToDisable }); const OSCAR=new Discord.Client({ disabledEvents: eventsToDisable });

MAIN.config = ini.parse(fs.readFileSync('./config/config.ini', 'utf-8'));

// CACHE DATA FROM JSONS
function load_files(){
  MAIN.proto = require('./static/en.json');
  MAIN.moves = require('./static/moves.json');
  MAIN.db = require('./static/database.json');
  MAIN.types = require('./static/types.json');
  MAIN.pokemon = require('./static/pokemon.json');
  MAIN.rewards = require('./static/rewards.json');
  MAIN.Discord = require('./config/discords.json');
  MAIN.geofences = require('./config/geojson.json');
  MAIN.config = ini.parse(fs.readFileSync('./config/config.ini', 'utf-8'));
}

// LOAD RAID FEED CHANNELS
const raid_channels = ini.parse(fs.readFileSync('./config/channels_raids.ini', 'utf-8'));
function load_raid_channels(){
  MAIN.Raid_Channels = [];
  for (var key in raid_channels){ 
        // CHECK IF ASSIGNED raid_template EXISTS, IF NOT, SET TO 'Default_Raid'
    if (!('raid_template' in raid_channels[key]) || raid_channels[key].raid_template == "") {raid_channels[key].raid_template = "Default_Raid";}
    if (!(raid_channels[key].raid_template in MAIN.Raid_Messages)) {
      console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] raid_template \''+ raid_channels[key].raid_template+'\' for Channel '+key+' is missing, setting to \'Default_Raid\'.');
      raid_channels[key].raid_template = "Default_Raid";      
    }
    // CHECK IF ASSIGNED egg_template EXISTS FOR NO IVS, IF NOT, SET TO 'Default_Egg'
    if (!('egg_template' in raid_channels[key]) || raid_channels[key].egg_template == "") {raid_channels[key].egg_template = "Default_Egg";}
    if (!(raid_channels[key].egg_template in MAIN.Raid_Messages)) {
      console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] egg_template \''+ raid_channels[key].egg_template+'\' for Channel '+key+' is missing, setting to \'Default_Egg\'.');
      raid_channels[key].egg_template = "Default_Egg";      
    }
    MAIN.Raid_Channels.push([key, raid_channels[key]]); }
  console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Loaded Raid Channels.');
}

// LOAD POKEMON FEED CHANNELS
const pokemon_channels = ini.parse(fs.readFileSync('./config/channels_pokemon.ini', 'utf-8'));
function load_pokemon_channels(){
  MAIN.Pokemon_Channels = [];
  for (var key in pokemon_channels){ 
    // CHECK IF ASSIGNED message_template EXISTS, IF NOT, SET TO 'Default'
    if (!('message_template' in pokemon_channels[key]) || pokemon_channels[key].message_template == "") {pokemon_channels[key].message_template = "Default";}
    if (!(pokemon_channels[key].message_template in MAIN.Pokemon_Messages)) {
      console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] message_template \''+ pokemon_channels[key].message_template+'\' for Channel '+key+' is missing, setting to \'Default\'.');
      pokemon_channels[key].message_template = "Default";      
    }
    // CHECK IF ASSIGNED message_template EXISTS FOR NO IVS, IF NOT, SET TO 'Default_noivs'
    if (!('message_template_noivs' in pokemon_channels[key]) || pokemon_channels[key].message_template_noivs == "") {pokemon_channels[key].message_template_noivs = "Default_noivs";}
    if (!(pokemon_channels[key].message_template_noivs in MAIN.Pokemon_Messages)) {
      console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] message_template_noivs \''+ pokemon_channels[key].message_template_noivs+'\' for Channel '+key+' is missing, setting to \'Default_noivs\'.');
      pokemon_channels[key].message_template_noivs = "Default_noivs";      
    }
    MAIN.Pokemon_Channels.push([key, pokemon_channels[key]]); 
  }
  console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Loaded Pokémon Channels');
}

// LOAD QUEST FEED CHANNELS
const quest_channels = ini.parse(fs.readFileSync('./config/channels_quests.ini', 'utf-8'));
function load_quest_channels(){
  MAIN.Quest_Channels = [];
  for (var key in quest_channels){ MAIN.Quest_Channels.push([key, quest_channels[key]]); }
  console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Loaded Quest Channels.');
}

// LOAD RAID MESSAGES
var raid_messages_init = {};
try {raid_messages_init = ini.parse(fs.readFileSync('./messages/raids.ini', 'utf-8'));} catch (err) {raid_messages_init = {};}
const raid_messages = raid_messages_init;
function load_raid_messages(){
  MAIN.Raid_Messages = {};
  for (var key in raid_messages){ 
    MAIN.Raid_Messages[key] = {};
    for (var subkey in raid_messages[key]) {MAIN.Raid_Messages[key][subkey] = raid_messages[key][subkey];}
  }
  // CHECK IF 'Default_Raid' message_template EXISTS, IF NOT, CREATE IT
  if (!('Default_Raid' in MAIN.Raid_Messages)) {
    MAIN.Raid_Messages['Default_Raid'] = {
                              'title':'**<pokemon_name>** has taken over a Gym!',
                              'description':'<move_name_1> <move_type_1> / <move_name_2> <move_type_2>',
                              'content':''
                            };
    MAIN.Raid_Messages['Default_Raid']['fieldtitle'] = [];
    MAIN.Raid_Messages['Default_Raid']['fieldtext'] = [];
    MAIN.Raid_Messages['Default_Raid']['fieldtitle'].push('<gym_name> | <geofence>');
    MAIN.Raid_Messages['Default_Raid']['fieldtext'].push('<pokemon_type>\nWeaknesses:');
    MAIN.Raid_Messages['Default_Raid']['fieldtitle'].push('Raid Ends: <end_time> (*<end_mins> Mins*)');
    MAIN.Raid_Messages['Default_Raid']['fieldtext'].push('Level <raid_level> | <defending_team>+<raid_sponsor>');
    MAIN.Raid_Messages['Default_Raid']['fieldtitle'].push('Directions:');
    MAIN.Raid_Messages['Default_Raid']['fieldtext'].push('[Google Maps](<googlemaps>) | [Apple Maps](<applemaps>) | [Waze](<waze>)');
  }
  if (!('Default_Egg' in MAIN.Raid_Messages)) {
    MAIN.Raid_Messages['Default_Egg'] = {
                              'title':'',
                              'description':'',
                              'content':''
                            };
    MAIN.Raid_Messages['Default_Egg']['fieldtitle'] = [];
    MAIN.Raid_Messages['Default_Egg']['fieldtext'] = [];
    MAIN.Raid_Messages['Default_Egg']['fieldtitle'].push('<gym_name>');
    MAIN.Raid_Messages['Default_Egg']['fieldtext'].push('<geofence>');
    MAIN.Raid_Messages['Default_Egg']['fieldtitle'].push('Hatches: <hatch_time> (*<hatch_mins> Mins*)');
    MAIN.Raid_Messages['Default_Egg']['fieldtext'].push('Level <raid_level> | <defending_team><raid_sponsor>');
    MAIN.Raid_Messages['Default_Egg']['fieldtitle'].push('Directions:');
    MAIN.Raid_Messages['Default_Egg']['fieldtext'].push('[Google Maps](<googlemaps>) | [Apple Maps](<applemaps>) | [Waze](<waze>)');
  }
  console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Loaded Raid Messages.');
}

// LOAD POKEMON MESSAGES
var pokemon_messages_init = {};
try {pokemon_messages_init = ini.parse(fs.readFileSync('./messages/pokemon.ini', 'utf-8'));} catch (err) {pokemon_messages_init = {};}
const pokemon_messages = pokemon_messages_init;
function load_pokemon_messages(){
  MAIN.Pokemon_Messages = {};
  for (var key in pokemon_messages){ 
    MAIN.Pokemon_Messages[key] = {};
    for (var subkey in pokemon_messages[key]) {MAIN.Pokemon_Messages[key][subkey] = pokemon_messages[key][subkey];}
  }
  // CHECK IF 'Default' message_template EXISTS, IF NOT, CREATE IT
  if (!('Default' in MAIN.Pokemon_Messages)) {
    MAIN.Pokemon_Messages['Default'] = {
                              'title':'<pokemon_name> <iv_a>/<iv_d>/<iv_s> (<iv>%)<weather_boost>',
                              'description':'',
                              'content':''
                            };
    MAIN.Pokemon_Messages['Default']['fieldtitle'] = [];
    MAIN.Pokemon_Messages['Default']['fieldtext'] = [];
    MAIN.Pokemon_Messages['Default']['fieldtitle'].push('Level <pokemon_level> | CP <cp><gender>');
    MAIN.Pokemon_Messages['Default']['fieldtext'].push('<move_name_1><move_type_1> / <move_name_2> <move_type_2>');
    MAIN.Pokemon_Messages['Default']['fieldtitle'].push('Disappears: <hide_time> (*<hide_minutes> Mins*)');
    MAIN.Pokemon_Messages['Default']['fieldtext'].push('Height: <height> | Weight: <weight> \n <pokemon_type>');
    MAIN.Pokemon_Messages['Default']['fieldtitle'].push('<geofence> | Directions:');
    MAIN.Pokemon_Messages['Default']['fieldtext'].push('[Google Maps](<googlemaps>) | [Apple Maps](<applemaps>) | [Waze](<waze>)');
  }
  // CHECK IF 'Default_noivs' message_template EXISTS, IF NOT, CREATE IT
  if (!('Default_noivs' in MAIN.Pokemon_Messages)) {
    MAIN.Pokemon_Messages['Default_noivs'] = {
                              'title':'<pokemon_name> <weather_boost>',
                              'description':'Disappears: <hide_time> (*<hide_minutes> Mins*)',
                              'content':''
                            };
    MAIN.Pokemon_Messages['Default_noivs']['fieldtitle'] = [];
    MAIN.Pokemon_Messages['Default_noivs']['fieldtext'] = [];
    MAIN.Pokemon_Messages['Default_noivs']['fieldtitle'].push('<geofence> | Directions:');
    MAIN.Pokemon_Messages['Default_noivs']['fieldtext'].push('[Google Maps](<googlemaps>) | [Apple Maps](<applemaps>) | [Waze](<waze>)');
  }
  console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Loaded Pokemon Messages.');
}

// DEFINE AND LOAD MODULES
var Raids, Emojis, Quests, Pokemon, Commands;
function load_modules(){
  Raids = require('./modules/raids.js');
  Emojis = require('./modules/emojis.js');
  Quests = require('./modules/quests.js');
  Pokemon = require('./modules/pokemon.js');
  Commands = require('./modules/commands.js');
  console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Loaded 5 Modules.');
}

// LOAD Commands
MAIN.Commands = new Discord.Collection();
function load_commands(){
  fs.readdir('./modules/commands', (err,files) => {
    let command_files = files.filter(f => f.split('.').pop()==='js'), command_count = 0;
    command_files.forEach((f,i) => {
      delete require.cache[require.resolve('./modules/commands/'+f)]; command_count++;
      let command = require('./modules/commands/'+f); MAIN.Commands.set(f.slice(0,-3), command);
    });
    console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Loaded '+command_count+' Command Files.')
  });
}

// LOAD FILTERS
MAIN.Filters = new Discord.Collection();
function load_filters(){
  fs.readdir('./filters', (err,filters) => {
    let filter_files = filters.filter(f => f.split('.').pop()==='json'), filter_count = 0;
    filter_files.forEach((f,i) => {
      delete require.cache[require.resolve('./filters/'+f)]; filter_count++;
      let filter = require('./filters/'+f); filter.name = f; MAIN.Filters.set(f, filter);
    }); console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Loaded '+filter_count+' Filters.');
  });
}

// DATABASE CONNECTION
MAIN.database = mysql.createConnection({
  host: MAIN.config.DB.host,
  user: MAIN.config.DB.username,
  password: MAIN.config.DB.password,
  port: MAIN.config.DB.port
}); MAIN.database.connect();

// GLOBAL VARIABLES
MAIN.BOTS = [];

// DEFINE LOGGING & DEBUGGING
MAIN.logging = MAIN.config.CONSOLE_LOGS;
MAIN.debug = MAIN.config.DEBUG;

// CREATE SERVER
const app=express().use(bodyParser.json());

// LISTEN FOR PAYLOADS
app.listen(MAIN.config.LISTENING_PORT, () => console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Now listening for payloads on port '+MAIN.config.LISTENING_PORT+'.'));

// ACCEPT AND SEND PAYLOADS TO ITS PARSE FUNCTION
app.post('/', (webhook, resolve) => {
  let PAYLOAD = webhook.body;

  // IGNORE IF BOT HAS NOT BEEN FINISHED STARTUP
  if(MAIN.Active != true){ return; }

  // SEPARATE EACH PAYLOAD AND SORT
  PAYLOAD.forEach( async (data,index) => {

    // IGNORE IF NOT A SPECIFIED OBJECT
    if(data.type == 'pokemon' || data.type == 'raid' || data.type == 'quest'){

      // DISCORD AND AREA VARIABLES
      let main_area = 'N/A', sub_area = 'N/A', server = 'N/A', geofence_area = {}, embed_area = '';

      MAIN.Discord.Servers.forEach( async (server,index) => {
        if(insideGeojson.polygon(server.geofence, [data.message.longitude,data.message.latitude])){

          // DEFINE THE GEOFENCE THE OBJECT IS WITHIN
          await MAIN.geofences.features.forEach( async (geofence,index) => {
            if(insideGeojson.polygon(geofence.geometry.coordinates, [data.message.longitude,data.message.latitude])){
              if(geofence.properties.sub_area != 'true'){ geofence_area.main = geofence.properties.name; }
              else if(geofence.properties.sub_area == 'false'){  geofence_area.sub = geofence.properties.name;  }
            }
          });

          // ASSIGN AREA TO VARIABLES
          if(geofence_area.sub){ embed_area = geofence_area.sub; sub_area = geofence_area.sub; }
          else{ embed_area = geofence_area.main; }
          if(geofence_area.main){ main_area = geofence_area.main; }
          else{ embed_area = server.name; main_area = server.name; }

          // SEND TO OBJECT MODULES
      		switch(data.type){
            // SEND TO POKEMON MODULE
      			case 'pokemon':
              Pokemon.run(MAIN, data.message, main_area, sub_area, embed_area, server); break;
            // SEND TO RAIDS MODULE
      			case 'raid':
              Raids.run(MAIN, data.message, main_area, sub_area, embed_area, server); break;
            // SEND TO QUESTS MODULE
      			case 'quest':
              Quests.run(MAIN, data.message, main_area, sub_area, embed_area, server); break;
      		}
        }
      });
    }
	}); return;
});

// SEND MESSAGE TO COMMAND MODULE
MAIN.on('message', message => { return Commands.run(MAIN, message); });

// SAVE A USER IN THE USER TABLE
MAIN.Save_Sub = (message,server) => {
  MAIN.database.query(`SELECT * FROM pokebot.info`, function (error, info, fields) {
    let next_bot = info[0].user_next_bot;
    if(next_bot == MAIN.BOTS.length-1){ next_bot = 0; } else{ next_bot++; }
    MAIN.database.query(`INSERT INTO pokebot.users (user_id, user_name, geofence, pokemon, quests, raids, status, bot, alert_time, discord_id, pokemon_status, raids_status, quests_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [message.member.id, message.member.user.tag, server.name, , , , 'ACTIVE', next_bot, MAIN.config.QUEST.Default_Delivery, message.guild.id, 'ACTIVE', 'ACTIVE', 'ACTIVE'], function (error, user, fields) {
      if(error){ console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] UNABLE TO ADD USER TO pokebot.users',error); }
      else{
        MAIN.sqlFunction('UPDATE pokebot.info SET user_next_bot = ?',[next_bot],undefined,undefined);
        console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Added '+message.member.user.tag+' to the pokebot.user database.');
        return message.reply('You did not have a subscription record. One has now been created. Please try the command again.').then(m => m.delete(15000)).catch(console.error);
      }
    });
  });
}

// RETURN TIME FUNCTION
MAIN.Bot_Time = (time,type) => {
	let now=new Date().getTime();
	if(type==1){ return moment.unix(time).format('h:mm A'); }
	if(type==2){ return moment(now).format('HHmm'); }
	if(type==3){ return moment(time).format('HHmm'); }
  if(type=='quest'){ return moment(now).format('dddd, MMMM Do')+' @ Midnight'; }
  if(type=='stamp'){ return moment(now).format('HH:mmA'); }
}

// OBTAIN POKEMON SPRITE
MAIN.Get_Sprite = (form, id) => {
  let spriteUrl = '';
  switch(id.toString().length){
    case 1: spriteUrl = 'https://www.serebii.net/sunmoon/pokemon/00'+id+'.png'; break;
    case 2: spriteUrl = 'https://www.serebii.net/sunmoon/pokemon/0'+id+'.png'; break;
    case 3: spriteUrl = 'https://www.serebii.net/sunmoon/pokemon/'+id+'.png'; break;
  }
  // CHECK FOR ALOLAN
  if(form > 0 && MAIN.pokemon.alolan_forms.indexOf(form) >= 0){ spriteUrl = spriteUrl.toString().slice(0,-4)+'-a.png'; }
  return spriteUrl;
}

// CHOOSE NEXT BOT AND SEND EMBED with optional content for tagging roles
MAIN.Send_Embed = (embed, channelID, content = '') => {
  if(MAIN.Next_Bot == MAIN.BOTS.length-1 && MAIN.BOTS[0]){ MAIN.Next_Bot = 0; } else{ MAIN.Next_Bot++; }
	return MAIN.BOTS[MAIN.Next_Bot].channels.get(channelID).send(content, embed).catch( error => { pokebotRestart(); console.error(embed,error); });
}

// CHOOSE NEXT BOT AND SEND EMBED
MAIN.Send_DM = (guild_id, user_id, embed, bot) => {
  MAIN.BOTS[bot].guilds.get(guild_id).fetchMember(user_id).then( TARGET => {
    TARGET.send(embed).catch(console.error);
  });
}

// GET QUEST REWARD ICON
MAIN.Get_Icon = (object, quest_reward) => {
  let questUrl = '';
  MAIN.rewards.array.forEach((reward,index) => {
    if(quest_reward.indexOf(reward.name) >= 0){ questUrl = reward.url; }
  }); return questUrl;
}

// CHECK FOR OR CREATE MAP TILES FOR EMBEDS
MAIN.Static_Map_Tile = (lat,lon,type) => {
  return new Promise(function(resolve, reject) {
    let path='./static/'+type+'_tiles/'+lat+','+lon+'.png';
    if(fs.existsSync(path)){ resolve(path); /*console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] USED AN EXISTING MAP TILE FOR '+lat+','+lon+'.');*/ }
    else{
      const zoom = 16, center = [lon,lat], options = { width: 400, height: 220 };
      const map = new StaticMaps(options);
      const marker = { img: `https://i.imgur.com/OGMRWnh.png`, width: 40, height: 40 };
      marker.coord = [lon,lat]; map.addMarker(marker);
      map.render(center, zoom)
        .then(() => map.image.save('./static/'+type+'_tiles/'+lat+','+lon+'.png'))
        .then(() => resolve('./static/'+type+'_tiles/'+lat+','+lon+'.png'))
        .catch(function(error){ console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Unable To Save Map Tile.',error); });
    }
  });
}

// GET EMOTE
MAIN.Get_Type = (variable) => {
  return new Promise(resolve => {
    switch(MAIN.moves[variable].type){
      case 'Normal': emote = MAIN.emotes.normal; break;
      case 'Grass': emote = MAIN.emotes.grass; break;
      case 'Fire': emote = MAIN.emotes.fire; break;
      case 'Water': emote = MAIN.emotes.water; break;
      case 'Electric': emote = MAIN.emotes.electric; break;
      case 'Ground': emote = MAIN.emotes.ground; break;
      case 'Steel': emote = MAIN.emotes.steel; break;
      case 'Rock': emote = MAIN.emotes.rock; break;
      case 'Psychic': emote = MAIN.emotes.psychic; break;
      case 'Poison': emote = MAIN.emotes.poison; break;
      case 'Fairy': emote = MAIN.emotes.fairy; break;
      case 'Fighting': emote = MAIN.emotes.fighting; break;
      case 'Dark': emote = MAIN.emotes.dark; break;
      case 'Ghost': emote = MAIN.emotes.ghost; break;
      case 'Bug': emote = MAIN.emotes.bug; break;
      case 'Dragon': emote = MAIN.emotes.dragon; break;
      case 'Ice': emote = MAIN.emotes.ice; break;
      case 'Flying': emote = MAIN.emotes.flying; break;
      default: emote = '';
    } resolve(emote);
  });
}

// INTERVAL FUNCTION TO SEND QUEST SUBSCRIPTION DMS
setInterval(function() {
  let timeNow=new Date().getTime();
  MAIN.database.query("SELECT * FROM pokebot.quest_alerts WHERE alert_time < "+timeNow, function (error, alerts, fields) {
    if(alerts && alerts[0]){
      alerts.forEach( async (alert,index) => {
        setTimeout(async function() {
          let quest = JSON.parse(alert.quest);
          MAIN.BOTS[alert.bot].guilds.get(alert.discord_id).fetchMember(alert.user_id).then( TARGET => {
            let quest_embed = JSON.parse(alert.embed);
            let attachment = new Discord.Attachment(quest_embed.file.attachment, quest_embed.file.name);
            let alert_embed = new Discord.RichEmbed()
              .setColor(quest_embed.color)
              .setThumbnail(quest_embed.thumbnail.url)
              .addField(quest_embed.fields[0].name, quest_embed.fields[0].value, false)
              .addField(quest_embed.fields[1].name, quest_embed.fields[1].value, false)
              .addField(quest_embed.fields[2].name, quest_embed.fields[2].value, false)
              .setImage(quest_embed.image.url)
              .attachFile(attachment)
              .setImage('attachment://'+quest_embed.file.name)
              .setFooter(quest_embed.footer.text);
            TARGET.send(alert_embed).catch( error => {
              console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+']'+TARGET.user.tag+' ('+alert.user_id+') , Cannot send this user a message.',error);
            });
          });
        }, 2000*index);
      });
      console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Sent '+alerts.length+' Quest Alerts.');
      MAIN.database.query("DELETE FROM pokebot.quest_alerts WHERE alert_time < "+timeNow, function (error, alerts, fields) { if(error){ console.error; } });
    }
  });
}, 60000);

// INTERVAL TO CLEAR MAP TILES TO SAVE DISK SPACE
// schedule.scheduleJob('* * 1 * * *', function(){
//   console.log('Today is recognized by Rebecca Black!');
// });
// setInterval(function() {
//   rimraf('./static/files/*', function () { console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Map Tiles Directory Has Been Cleared.'); });
// }, 86400000);

// SQL QUERY FUNCTION
MAIN.sqlFunction = (sql,data,logSuccess,logError) => {
  return new Promise(resolve => {
  	MAIN.database.query(sql, data, function (error, result, fields) {
  		if(error){ console.error(logError,error); }
      if(logSuccess){ console.info(logSuccess); }
      resolve(result);
  	});
  });
}

// PERFORM AN UPDATE FOR EACH VERSION UP TO LATEST
async function updateEachVersion(version){
  return new Promise(async (resolve) => {
    for(let u = version; u <= MAIN.db.LATEST; u++){
      if(u == MAIN.db.LATEST){ resolve('DONE'); }
      else{
        let updateTo = u+1;
        await MAIN.db[updateTo].forEach(async (update,index) => {
          await MAIN.sqlFunction(update.sql, update.data, '[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] '+update.gLog, update.bLog);
          await MAIN.sqlFunction(`UPDATE pokebot.info SET db_version = ? WHERE db_version = ?`, [updateTo,u], undefined, '[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] UNABLE TO UPDATE THE pokebot.info TABLE.')
        });
        await console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Database updated to Version '+updateTo+'.');
      }
    }
  });
}

// CREATE DATABASE, TABLES, AND CHECK FOR UPDATES
async function update_database(){
  return new Promise(async function(resolve, reject) {
    await MAIN.sqlFunction('CREATE DATABASE IF NOT EXISTS pokebot', undefined, undefined,'[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] UNABLE TO CREATE THE Pokébot DATABASE.');
    await MAIN.sqlFunction('CREATE TABLE IF NOT EXISTS pokebot.users (user_id TEXT, user_name TEXT, geofence TEXT, pokemon TEXT, quests TEXT, raids TEXT, paused TEXT, bot TEXT, alert_time TEXT, city TEXT)', undefined, undefined,'[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] UNABLE TO CREATE THE pokebot.user TABLE.');
    await MAIN.sqlFunction('CREATE TABLE IF NOT EXISTS pokebot.quest_alerts (user_id TEXT, quest TEXT, embed TEXT, area TEXT, bot TEXT, alert_time bigint, city text)', undefined, undefined,'[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] UNABLE TO CREATE THE pokebot.quest_alerts TABLE.');
    await MAIN.sqlFunction(`CREATE TABLE IF NOT EXISTS pokebot.info (db_version INT)`, undefined, undefined,'[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] UNABLE TO CREATE THE pokebot.info TABLE.');
    await MAIN.database.query(`SELECT * FROM pokebot.info`, async function (error, row, fields) {
      if(!row || !row[0]){
        await MAIN.sqlFunction(`INSERT INTO pokebot.info (db_version) VALUES (?)`,[1], undefined,'[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] UNABLE TO INSERT INTO THE pokebot.info TABLE.')
          .then(async (db) => { let version = await updateEachVersion(1); resolve(version); });
      }
      else if(row[0].db_version < MAIN.db.LATEST){
        await console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Database Update Found. Updating...');
        let version = await updateEachVersion(row[0].db_version); resolve(version);
      }
      else{ resolve(false); }
    });
  });
}

// SET ALL TO INVISIBLE ON READY
ALPHA.on('ready', () => { ALPHA.user.setPresence({ status: 'invisible' }); });
BRAVO.on('ready', () => { BRAVO.user.setPresence({ status: 'invisible' }); });
CHARLIE.on('ready', () => { CHARLIE.user.setPresence({ status: 'invisible' }); });
DELTA.on('ready', () => { DELTA.user.setPresence({ status: 'invisible' }); });
ECHO.on('ready', () => { ECHO.user.setPresence({ status: 'invisible' }); });
FOXTROT.on('ready', () => { FOXTROT.user.setPresence({ status: 'invisible' }); });
GULF.on('ready', () => { GULF.user.setPresence({ status: 'invisible' }); });
HOTEL.on('ready', () => { HOTEL.user.setPresence({ status: 'invisible' }); });
INDIA.on('ready', () => { INDIA.user.setPresence({ status: 'invisible' }); });
JULIET.on('ready', () => { JULIET.user.setPresence({ status: 'invisible' }); });
KILO.on('ready', () => { KILO.user.setPresence({ status: 'invisible' }); });
LIMA.on('ready', () => { LIMA.user.setPresence({ status: 'invisible' }); });
MIKE.on('ready', () => { MIKE.user.setPresence({ status: 'invisible' }); });
NOVEMBER.on('ready', () => { NOVEMBER.user.setPresence({ status: 'invisible' }); });
OSCAR.on('ready', () => { OSCAR.user.setPresence({ status: 'invisible' }); });

// LOG IN BOTS AND ADD TO BOT ARRAY
async function bot_login(){
  let token = MAIN.config.TOKENS;
  await MAIN.login(token.MAIN);
  if(token.BOT_TOKENS[0] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(ALPHA); ALPHA.login(token.BOT_TOKENS[0]); }
  if(token.BOT_TOKENS[1] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(BRAVO); BRAVO.login(token.BOT_TOKENS[1]); }
  if(token.BOT_TOKENS[2] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(CHARLIE); CHARLIE.login(token.BOT_TOKENS[2]); }
  if(token.BOT_TOKENS[3] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(DELTA); DELTA.login(token.BOT_TOKENS[3]); }
  if(token.BOT_TOKENS[4] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(ECHO); ECHO.login(token.BOT_TOKENS[4]); }
  if(token.BOT_TOKENS[5] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(FOXTROT); FOXTROT.login(token.BOT_TOKENS[5]); }
  if(token.BOT_TOKENS[6] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(GULF); GULF.login(token.BOT_TOKENS[6]); }
  if(token.BOT_TOKENS[7] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(HOTEL); HOTEL.login(token.BOT_TOKENS[7]); }
  if(token.BOT_TOKENS[8] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(INDIA); INDIA.login(token.BOT_TOKENS[8]); }
  if(token.BOT_TOKENS[9] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(JULIET); JULIET.login(token.BOT_TOKENS[9]); }
  if(token.BOT_TOKENS[10] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(KILO); KILO.login(token.BOT_TOKENS[10]); }
  if(token.BOT_TOKENS[11] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(LIMA); LIMA.login(token.BOT_TOKENS[11]); }
  if(token.BOT_TOKENS[12] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(MIKE); MIKE.login(token.BOT_TOKENS[12]); }
  if(token.BOT_TOKENS[13] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(NOVEMBER); NOVEMBER.login(token.BOT_TOKENS[13]); }
  if(token.BOT_TOKENS[14] && token.BOT_TOKENS[0] != 'TOKEN'){ await MAIN.BOTS.push(OSCAR); OSCAR.login(token.BOT_TOKENS[14]); }
  if(MAIN.config.DEBUG.Quests == 'ENABLED'){
    await console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Quest Debugging is ENABLED.');
  }
  if(MAIN.config.DEBUG.Raids == 'ENABLED'){
    await console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Raid Debugging is ENABLED.');
  }
  if(MAIN.config.DEBUG.Pokemon == 'ENABLED'){
    await console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Pokemon Debugging is ENABLED.');
  }
  if(MAIN.config.DEBUG.Subscriptions == 'ENABLED'){
    await console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Subscription Debugging is ENABLED.');
  }
  if(MAIN.config.CONSOLE_LOGS == 'ENABLED'){
    await console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Console Logging is ENABLED');
  }
  await console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Pokébot is Ready.');

  // SET ACTIVE BOOLEAN TO TRUE AND BOT POOL TO ZERO
  MAIN.Active = true; MAIN.Next_Bot = 0;

  // CHECK FOR CUSTOM EMOTES (CHUCKLESLOVE MERGE)
  if(MAIN.config.EMOTES.Custom == false){
    MAIN.emotes = new Emojis.DiscordEmojis();
    MAIN.Custom_Emotes = true;
    MAIN.emotes.Load(MAIN);
  }
  else{
    MAIN.Custom_Emotes = false;
    MAIN.emotes = ini.parse(fs.readFileSync('./config/emotes.ini', 'utf-8'));
  }
}

ontime({ cycle: MAIN.config.QUEST.Reset_Time }, function(ot) {
	MAIN.Discord.Servers.forEach(function(server) {
    if(server.research_channels){
  		for(var i = 0; i < server.research_channels.length; i++){
  			ClearChannel(server.research_channels[i]);
  		}
    }
	});
});

function ClearChannel(channelID){
  return new Promise(function(resolve) {
    let channel = MAIN.channels.get(channelID);
    if(!channel) { resolve(false); console.error("Could not find a channel with ID: "+channelID); return;}
    channel.fetchMessages({limit:99}).then(messages => {
      channel.bulkDelete(messages).then(deleted => {
        if(messages.size > 0){
          ClearChannel(channelID).then(result => { resolve(true); return; });
        }
        else{
          console.log("Cleared messages from channel: "+channel.name);
          resolve(true); return;
        }
      }).catch(console.error);
    });
  });
}

// RESTART FUNCTION
function pokebotRestart(){ process.exit(1); }

// CRANK UP THE BOT
MAIN.start = async (type) => {
  await load_files();
  await load_modules();
  await load_commands();
  await load_raid_messages();
  await load_pokemon_messages();
  await load_raid_channels();
  await load_quest_channels();
  await load_pokemon_channels();
  await load_filters();
  await update_database();
  switch(type){
    case 'startup':
      await bot_login(); break;
    case 'reload':
      console.log('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] Pokébot has re-loaded.'); break;
  }
}
MAIN.start('startup');
