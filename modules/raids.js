//####################################################//
//####################################################//
//#####   _____            _____ _____   _____   #####//
//#####  |  __ \     /\   |_   _|  __ \ / ____|  #####//
//#####  | |__) |   /  \    | | | |  | | (___    #####//
//#####  |  _  /   / /\ \   | | | |  | |\___ \   #####//
//#####  | | \ \  / ____ \ _| |_| |__| |____) |  #####//
//#####  |_|  \_\/_/    \_\_____|_____/|_____/   #####//
//#####     RAID WEBHOOKS, AND SUBSCRIPTIONS     #####//
//####################################################//
//####################################################//

const Discord = require('discord.js');
const Subscription = require('./subscriptions/raids.js');
const insideGeofence = require('point-in-polygon');
const insideGeojson = require('point-in-geopolygon');

module.exports.run = async (MAIN, raid, main_area, sub_area, embed_area, server) => {

  // CHECK SUBSCRIPTION CONFIG
  if(MAIN.config.RAID.Subscriptions == 'ENABLED'){
    Subscription.run(MAIN, raid, main_area, sub_area, embed_area, server);
  } //else{ console.info('[Pokébot] Raid ignored due to Disabled Subscription setting.'); }

  if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Received a Raid.'); }

  // FILTER FEED TYPE FOR EGG, BOSS, OR BOTH
  let type = '';
  if(raid.cp > 0){ type = 'Boss'; } else{ type = 'Egg'; }

  // CHECK EACH FEED FILTER
  MAIN.Raid_Channels.forEach( async (raid_channel,index) => {

    // DEFINE MORE VARIABLES
    let geofences = raid_channel[1].geofences.split(',');
    let channel = MAIN.channels.get(raid_channel[0]);
    let filter = MAIN.Filters.get(raid_channel[1].filter);
    let message_templates = {
        raid:raid_channel[1].raid_template,
        egg:raid_channel[1].egg_template
    }
    
    // THROW ERRORS AND BREAK FOR INVALID DATA
    if(!filter){ console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] The filter defined for'+raid_channel[0]+' does not appear to exist.'); }
    else if(!channel){ console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] The channel '+raid_channel[0]+' does not appear to exist.'); }

    // CHECK RAID TYPE
    else if(filter.Egg_Or_Boss_Or_Both.toLowerCase() == 'both' || filter.Egg_Or_Boss_Or_Both.toLowerCase() == type.toLowerCase()){

      // FILTER FOR RAID LEVEL
      if(filter.Raid_Levels.indexOf(raid.level) >= 0){

        // AREA FILTER
        if(geofences.indexOf(server.name)>=0 || geofences.indexOf(main_area)>=0 || geofences.indexOf(sub_area)>=0){

          // CHECK FOR EX ELIGIBLE REQUIREMENT
          if(filter.Ex_Eligible_Only == undefined || filter.Ex_Eligible_Only != true){
            if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Passed Filters for '+raid_channel[0]+'.'); }
            send_raid(MAIN, channel, raid, type, main_area, sub_area, embed_area, server,message_templates);
          }
          else if(filter.Ex_Eligible_Only == raid.sponsor_id){
            if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Passed Filters for '+raid_channel[0]+'.'); }
            send_raid(MAIN, channel, raid, type, main_area, sub_area, embed_area, server,message_templates);
          }
        }
        else{
          if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Did Not Pass Channel Geofences for '+raid_channel[0]+'. Expected: '+raid_channel[1].geofences+' Saw: '+server.name+'|'+main_area+'|'+sub_area); }
        }
      }
      else{
        if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Did Not Pass Level Filter for '+raid_channel[0]+' Expected: '+filter.Raid_Levels.toString()+' Saw: '+raid.level); }
      }
    }
    else{
      if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Did Not Discord Filter for '+raid_channel[0]+'. Expected: '+filter.Egg_Or_Boss_Or_Both+', Saw: '+type.toLowerCase()); }
    }
  });
}

function send_raid(MAIN, channel, raid, type, main_area, sub_area, embed_area, server, message_templates){

  // VARIABLES
  let time_now = new Date().getTime(), hatch_time = MAIN.Bot_Time(raid.start,'1');
  let end_time = MAIN.Bot_Time(raid.end,'1');
  let hatch_mins = Math.floor((raid.start-(time_now/1000))/60);
  let end_mins = Math.floor((raid.end-(time_now/1000))/60);

  MAIN.Static_Map_Tile(raid.latitude,raid.longitude,'raid').then(async function(imgUrl){

    if(MAIN.debug.Raids == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Modules] [raids.js] Map Tile for '+type+' Retrieved.'); }

    // ATTACH THE MAP TILE
    let attachment = new Discord.Attachment(imgUrl, 'Raid_Alert.png');

    // DETERMINE GYM CONTROL
    let defending_team = '';
    switch(raid.team_id){
      case 1: defending_team = MAIN.emotes.mystic; break;
      case 2: defending_team = MAIN.emotes.valor; break;
      case 3: defending_team = MAIN.emotes.instinct; break;
      default: defending_team = 'Uncontested';
    }

    // GET RAID LEVEL
    let embed_color = '';
    switch(raid.level){
      case 1:
      case 2: embed_color = 'f358fb'; break;
      case 3:
      case 4: embed_color = 'ffd300'; break;
      case 5: embed_color = '5b00de'; break;
    }

    // CHECK IF SPONSORED GYM
    let raid_sponsor = '';
    if(raid.sponsor_id == true){ raid_sponsor = ' | '+MAIN.emotes.exPass+' Eligible'; }

    // CHECK FOR GYM NAME
    let gym_name = '';
    if(!raid.gym_name){ gym_name = 'No Name'; }
    else{ gym_name = raid.gym_name; }

    // DETERMINE IF IT'S AN EGG OR A RAID
    let embed_thumb = '', raid_embed = '';
    switch(type){

      case 'Egg':
        // GET EGG IMAGE
        switch(raid.level){
          case 1:
          case 2: embed_thumb = 'https://i.imgur.com/ABNC8aP.png'; break;
          case 3:
          case 4: embed_thumb = 'https://i.imgur.com/zTvNq7j.png'; break;
          case 5: embed_thumb = 'https://i.imgur.com/jaTCRXJ.png'; break;
        }

        // REPLACE TAGS IN MESSAGES WITH ACTUAL VALUES
        function replace_variables_egg(string) {
          var mapObj = {
             '<hatch_time>':hatch_time,
             '<hatch_mins>':hatch_mins,
             '<thumbnail>':embed_thumb,
             '<raid_level>':raid.level,
             '<egg_level>':raid.level,
             '<defending_team>':defending_team,
             '<sponsor>':raid_sponsor,
             '<raid_sponsor>':raid_sponsor,
             '<gym_name>':raid.gym_name,
             '<geofence>':embed_area,
             '<lat>':raid.latitude,
             '<lon>':raid.longitude,
             '<googlemaps>':'https://www.google.com/maps?q='+raid.latitude+','+raid.longitude,
             '<applemaps>':'http://maps.apple.com/maps?daddr='+raid.latitude+','+raid.longitude+'&z=10&t=s&dirflg=w',
             '<waze>':'https://waze.com/ul?ll='+raid.latitude+','+raid.longitude+'&navigate=yes'
          };
          var re = new RegExp(Object.keys(mapObj).join("|"),"gi");
          string = string.replace(re, function(matched){return mapObj[matched];});
          // THIS REPLACE IS NEEDED BECAUSE INI IS LOADED IN UTF-8 WHICH DOESNT SUPPORT \n
          return string.replace('\\'+'n','\n');
        }
        
        // CREATE THE EGG EMBED
        var egg_template = MAIN.Raid_Messages[message_templates['egg']];
        raid_embed = new Discord.RichEmbed()
          .attachFile(attachment).setImage('attachment://Raid_Alert.png')
          .setThumbnail(embed_thumb).setColor(embed_color)
          .setTitle(replace_variables_egg(egg_template['title']))
          .setDescription(replace_variables_egg(egg_template['description'])
        );
        var count = 0;
        for(var i = 0; i < egg_template['fieldtitle'].length; ++i){
          var fieldtitle = egg_template['fieldtitle'][i];
          var fieldtext = egg_template['fieldtext'][i];
          raid_embed.addField(replace_variables_egg(fieldtitle)+'_ _',replace_variables_egg(fieldtext)+'_ _');
          count++; 
        }

        // CHECK DISCORD CONFIG
        if(MAIN.config.RAID.Discord_Feeds == 'ENABLED'){
          if(MAIN.logging == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Modules] [raids.js] Sent a Level '+raid.level+' '+type+' to '+channel.guild.name+' ('+channel.id+').'); }
          MAIN.Send_Embed(raid_embed, channel.id);
        } else{ console.info('[Pokébot] Raid ignored due to Disabled Discord Feed setting.'); }
        break;

      // RAID IS A BOSS
      case 'Boss':

        // DETERMINE POKEMON NAME AND TYPE
        let pokemon_type = '';
        let pokemon_name = MAIN.pokemon[raid.pokemon_id].name;
        await MAIN.pokemon[raid.pokemon_id].types.forEach((type) => {  pokemon_type += type+' '+MAIN.emotes[type.toLowerCase()]+' / '; });
        pokemon_type = pokemon_type.slice(0,-3);

        // DETERMINE MOVE NAMES AND TYPES
        let move_name_1 = MAIN.moves[raid.move_1].name;
        let move_type_1 = await MAIN.Get_Type(raid.move_1);
        let move_name_2 = MAIN.moves[raid.move_2].name;
        let move_type_2 = await MAIN.Get_Type(raid.move_2);

        // GET THE RAID BOSS SPRITE
        let raid_url = await MAIN.Get_Sprite(raid.form, raid.pokemon_id);

        // GET THE BOSS MOVESET
        if(!MAIN.moves[raid.move_1].name){ console.error('Move ID #'+raid.move_1+' not found in pokemon.json. Please report to the Discord.'); }
        if(!MAIN.moves[raid.move_2].name){ console.error('Move ID #'+raid.move_2+' not found in pokemon.json. Please report to the Discord.'); }

        // REPLACE TAGS IN MESSAGES WITH ACTUAL VALUES
        function replace_variables_raid(string) {
          var mapObj = {
             '<end_time>':end_time,
             '<end_mins>':end_mins,
             '<thumbnail>':raid_url,
             '<raid_level>':raid.level,
             '<move_name_1>':move_name_1,
             '<move_type_1>':move_type_1,
             '<move_name_2>':move_name_2,
             '<move_type_2>':move_type_2,
             '<gym_name>':raid.gym_name,
             '<pokemon_name>':pokemon_name,
             '<pokemon_type>':pokemon_type,
             '<defending_team>':defending_team,
             '<sponsor>':raid_sponsor,
             '<raid_sponsor>':raid_sponsor,
             '<geofence>':embed_area,
             '<lat>':raid.latitude,
             '<lon>':raid.longitude,
             '<googlemaps>':'https://www.google.com/maps?q='+raid.latitude+','+raid.longitude,
             '<applemaps>':'http://maps.apple.com/maps?daddr='+raid.latitude+','+raid.longitude+'&z=10&t=s&dirflg=w',
             '<waze>':'https://waze.com/ul?ll='+raid.latitude+','+raid.longitude+'&navigate=yes'
          };
          var re = new RegExp(Object.keys(mapObj).join("|"),"gi");
          string = string.replace(re, function(matched){return mapObj[matched];});
          // THIS REPLACE IS NEEDED BECAUSE INI IS LOADED IN UTF-8 WHICH DOESNT SUPPORT \n
          return string.replace('\\'+'n','\n');
        }
        
        // CREATE THE RAID EMBED
        var raid_template = MAIN.Raid_Messages[message_templates['raid']];
        raid_embed = new Discord.RichEmbed()
          .attachFile(attachment).setImage('attachment://Raid_Alert.png')
          .setThumbnail(raid_url).setColor(embed_color)
          .setTitle(replace_variables_raid(raid_template['title']))
          .setDescription(replace_variables_raid(raid_template['description'])
        );
        var count = 0;
        for(var i = 0; i < raid_template['fieldtitle'].length; ++i){
          var fieldtitle = raid_template['fieldtitle'][i];
          var fieldtext = raid_template['fieldtext'][i];
          raid_embed.addField(replace_variables_raid(fieldtitle)+'_ _',replace_variables_raid(fieldtext)+'_ _');
          count++; 
        }

        // CHECK DISCORD CONFIG
        if(MAIN.config.RAID.Discord_Feeds == 'ENABLED'){
          if(MAIN.logging == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Modules] [raids.js] Sent a '+pokemon_name+' Raid '+type+' to '+channel.guild.name+' ('+channel.id+').'); }
          MAIN.Send_Embed(raid_embed, channel.id);
        } else{ console.info('[Pokébot] Raid ignored due to Disabled Discord Feed setting.'); }
        break;
    }
  });
}
