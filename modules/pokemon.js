//#############################################################//
//#############################################################//
//#####   _____   ____  _  ________ __  __  ____  _   _   #####//
//#####  |  __ \ / __ \| |/ /  ____|  \/  |/ __ \| \ | |  #####//
//#####  | |__) | |  | | ' /| |__  | \  / | |  | |  \| |  #####//
//#####  |  ___/| |  | |  < |  __| | |\/| | |  | | . ` |  #####//
//#####  | |    | |__| | . \| |____| |  | | |__| | |\  |  #####//
//#####  |_|     \____/|_|\_\______|_|  |_|\____/|_| \_|  #####//
//#####                  POKEMON FEEDS                    #####//
//#############################################################//
//#############################################################//

const Discord = require('discord.js');
const Subscription = require('./subscriptions/pokemon.js');
const insideGeofence = require('point-in-polygon');
const insideGeojson = require('point-in-geopolygon');

module.exports.run = async (MAIN, sighting, main_area, sub_area, embed_area, server) => {

  // VARIABLES
  let internal_value = (sighting.individual_defense+sighting.individual_stamina+sighting.individual_attack)/45;
  let time_now = new Date().getTime(); internal_value = Math.floor(internal_value*1000)/10;

  // CHECK SUBSCRIPTION CONFIG
  if(MAIN.config.POKEMON.Subscriptions == 'ENABLED' && sighting.cp > 0){
    Subscription.run(MAIN, internal_value, sighting, time_now, main_area, sub_area, embed_area, server);
  }

  // CHECK ALL FILTERS
  MAIN.Pokemon_Channels.forEach((pokemon_channel,index) => {

    // DEFINE FILTER VARIABLES
    let geofences = pokemon_channel[1].geofences.split(',');
    let channel = MAIN.channels.get(pokemon_channel[0]);
    let filter = MAIN.Filters.get(pokemon_channel[1].filter);
    let message_template_name = pokemon_channel[1].message_template;
    let message_template_name_noivs = pokemon_channel[1].message_template_noivs;

    // THROW ERRORS FOR INVALID DATA
    if(!filter){ console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] The filter defined for'+pokemon_channel[0]+' does not appear to exist.'); }
    if(!channel){ console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] The channel '+pokemon_channel[0]+' does not appear to exist.'); }

    // CHECK FEED TYPE
    if(filter.Type == 'pokemon'){

      // AREA FILTER
      if(geofences.indexOf(server.name)>=0 || geofences.indexOf(main_area)>=0 || geofences.indexOf(sub_area)>=0){

        // CHECK IF THE POKEMON NAME IS SET TO FALSE
        if(filter[MAIN.pokemon[sighting.pokemon_id].name] != 'False'){

          // CHECK IF POKEMON IS ENABLED OR SET TO A SPECIFIC IV
          if(filter[MAIN.pokemon[sighting.pokemon_id].name] == 'True'){

            // CHECK IF THE POKEMON HAS BEEN IV SCANNED
            if(sighting.cp > 0){

              // CHECK THE MIN AND MAX IV AND LEVEL SET FOR THE ENTIRE FEED
              if(filter.min_iv <= internal_value && filter.max_iv >= internal_value && filter.min_level <= sighting.pokemon_level && filter.max_level >= sighting.pokemon_level){

                // SEND POKEMON TO DISCORD
                send_pokemon(MAIN, internal_value, sighting, channel, time_now, main_area, sub_area, embed_area, server, message_template_name);
              }
              else{
                // DEBUG
                if(MAIN.debug.Pokemon == 'ENABLED'){ console.info('[DEBUG] [pokemon.js] Pokemon Did Not Pass Any Filters. '+sighting.encounter_id); }
              }
            }
            else if(filter.Post_Without_IV == true){
              send_pokemon(MAIN, internal_value, sighting, channel, time_now, main_area, sub_area, embed_area, server, message_template_name_noivs);
            }
          }
          else if(filter[MAIN.pokemon[sighting.pokemon_id].name].min_iv <= internal_value && filter.max_iv >= internal_value){

            // CHECK IF THE POKEMON HAS BEEN IV SCANNED OR TO POST WITHOUT IV
            if(sighting.cp > 0){
              send_pokemon(MAIN, internal_value, sighting, channel, time_now, main_area, sub_area, embed_area, server, message_template_name);
            }
            else if(filter.Post_Without_IV == true){
              send_pokemon(MAIN, internal_value, sighting, channel, time_now, main_area, sub_area, embed_area, server, message_template_name_noivs);
            }
          }
          else{
            // DEBUG
            if(MAIN.debug.Pokemon=='ENABLED'){ console.info('[DEBUG] [pokemon.js] Pokemon Did Not Pass Any Filters.'); }
          } return;
        }
        else{
          // DEBUG
          if(MAIN.debug.Pokemon=='ENABLED'){ console.info('[DEBUG] [pokemon.js] Pokemon Set to False in the filter.'); }
        }
      }
      else{
        // DEBUG
        if(MAIN.debug.Pokemon=='ENABLED') { console.info('[DEBUG] [pokemon.js] Pokemon Did Not Meet Any Area Filters. '+pokemon_channel[0]+' | Saw: '+server.geofence+','+main_area+','+sub_area+' | Expected: '+pokemon_channel[1].geofences); }
      }
    }
  }); return;
}

function send_pokemon(MAIN, internal_value, sighting, channel, time_now, main_area, sub_area, embed_area, server, message_template_name){

  // DEBUG ACK
  if(MAIN.debug.Pokemon == 'ENABLED'){ console.info('[DEBUG] [pokemon.js] Encounter Received to Send to Discord. '+sighting.encounter_id); }

  // FETCH THE MAP TILE
  MAIN.Static_Map_Tile(sighting.latitude,sighting.longitude,'pokemon').then(async function(img_url){

    // DEFINE VARIABLES
    let hide_time = await MAIN.Bot_Time(sighting.disappear_time,'1');
    let hide_minutes = Math.floor((sighting.disappear_time-(time_now/1000))/60);

    // ATTACH THE MAP TILE
    let attachment = new Discord.Attachment(img_url, 'Pokemon_Alert.png');
    
    // DETERMINE MOVE NAMES AND TYPES
    // let move_name_1 = MAIN.moves[sighting.move_1].name;
    let move_name_1 = (sighting.move_1 == null) ? '??' : MAIN.moves[sighting.move_1].name;
    let move_type_1 = (sighting.move_1 == null) ? '??' : await MAIN.Get_Type(sighting.move_1);
    let move_name_2 = (sighting.move_2 == null) ?'??' :  MAIN.moves[sighting.move_2].name;
    let move_type_2 = (sighting.move_2 == null) ? '??' : await MAIN.Get_Type(sighting.move_2);
    let height = (sighting.height == null) ? '??' : Math.floor(sighting.height*100)/100+'m';
    let weight = (sighting.weight == null) ? '??' : Math.floor(sighting.weight*100)/100+'kg';
    
    // GET GENDER
    let gender = '';
    switch(sighting.gender){
      case 1: gender = ' | ♂Male'; break;
      case 2: gender = ' | ♀Female'; break;
    }

    // GET POKEMON NAME, TYPE(S) AND EMOTE
    let pokemon_name = MAIN.pokemon[sighting.pokemon_id].name;
    let pokemon_type = '';
    MAIN.pokemon[sighting.pokemon_id].types.forEach((type) => {
      pokemon_type += type+' '+MAIN.emotes[type.toLowerCase()]+' / ';
    }); pokemon_type = pokemon_type.slice(0,-3);

    // GET SPRITE IMAGE
    let pokemon_url = await MAIN.Get_Sprite(sighting.form, sighting.pokemon_id);
  
    // GET WEATHER BOOST
    let weather_emoji = '';
    let weather = '';
    switch(sighting.weather){
      case 1: weather_emoji = MAIN.emotes.clear+' *Boosted*'; weather = 'clear'; break;
      case 2: weather_emoji = MAIN.emotes.rain+' *Boosted*'; weather = 'raid'; break;
      case 3: weather_emoji = MAIN.emotes.partlyCloudy+' *Boosted*'; weather = 'partly Cloudy'; break;
      case 4: weather_emoji = MAIN.emotes.cloudy+' *Boosted*'; weather = 'cloudy'; break;
      case 5: weather_emoji = MAIN.emotes.windy+' *Boosted*'; weather = 'windy'; break;
      case 6: weather_emoji = MAIN.emotes.snow+' *Boosted*'; weather = 'snow'; break;
      case 7: weather_emoji = MAIN.emotes.fog+' *Boosted*'; weather = 'fog'; break;
    }

    // REPLACE TAGS IN MESSAGES WITH ACTUAL VALUES
    function replace_variables(string) {
      var mapObj = {
         '<hide_time>':hide_time,
         '<hide_minutes>':hide_minutes,
         '<move_name_1>':move_name_1,
         '<move_type_1>':move_type_1,
         '<move_name_2>':move_name_2,
         '<move_type_2>':move_type_2,
         '<pokemon_name>':pokemon_name,
         '<height>':height,
         '<weight>':weight,
         '<pokemon_type>':pokemon_type,
         '<pokemon_url>':pokemon_url,
         '<gender>':gender,
         '<weather>':weather,
         '<weather_emoji>':weather_emoji,
         '<pokemon_level>':sighting.pokemon_level,
         '<cp>':sighting.cp,
         '<iv_a>':sighting.individual_attack,
         '<iv_d>':sighting.individual_defense,
         '<iv_s>':sighting.individual_stamina,
         '<iv>':internal_value,
         '<geofence>':embed_area,
         '<lat>':sighting.latitude,
         '<lon>':sighting.longitude,
         '<googlemaps>':'https://www.google.com/maps?q='+sighting.latitude+','+sighting.longitude,
         '<applemaps>':'http://maps.apple.com/maps?daddr='+sighting.latitude+','+sighting.longitude+'&z=10&t=s&dirflg=w',
         '<waze>':'https://waze.com/ul?ll='+sighting.latitude+','+sighting.longitude+'&navigate=yes'
      };
      var re = new RegExp(Object.keys(mapObj).join("|"),"gi");
      string = string.replace(re, function(matched){return mapObj[matched];});
      // THIS REPLACE IS NEEDED BECAUSE INI IS LOADED IN UTF-8 WHICH DOESNT SUPPORT \n
      return string.replace('\\'+'n','\n');
    }
    
    // CREATE AND SEND THE EMBED
    var message_template = MAIN.Pokemon_Messages[message_template_name]
    let pokemon_embed = new Discord.RichEmbed()
      .attachFile(attachment).setImage('attachment://Pokemon_Alert.png')
      .setColor('00ccff').setThumbnail(pokemon_url)
      .setTitle(replace_variables(message_template['title']))
      .setDescription(replace_variables(message_template['description']));
      var count = 0;
      for(var i = 0; i < message_template['fieldtitle'].length; ++i){
        var fieldtitle = message_template['fieldtitle'][i];
        var fieldtext = message_template['fieldtext'][i];;
        pokemon_embed.addField(replace_variables(fieldtitle)+'_ _',replace_variables(fieldtext)+'_ _');
        count++; 
      }

    // CHECK DISCORD CONFIG
    if(MAIN.config.POKEMON.Discord_Feeds == 'ENABLED'){
      if(MAIN.logging == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Modules] Sent a '+pokemon_name+' to '+channel.guild.name+' ('+channel.id+').'); }
      MAIN.Send_Embed(pokemon_embed, channel.id, message_template['content']);
    }
  }); return;
}