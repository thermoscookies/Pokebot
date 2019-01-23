//#############################################################//
//#############################################################//
//    _____ ____  __  __ __  __          _   _ _____   _____   //
//   / ____/ __ \|  \/  |  \/  |   /\   | \ | |  __ \ / ____|  //
//  | |   | |  | | \  / | \  / |  /  \  |  \| | |  | | (___    //
//  | |   | |  | | |\/| | |\/| | / /\ \ | . ` | |  | |\___ \   //
//  | |___| |__| | |  | | |  | |/ ____ \| |\  | |__| |____) |  //
//   \_____\____/|_|  |_|_|  |_/_/    \_\_| \_|_____/|_____/   //
//       SUBSCRIPTIONS AND BOT ADMINISTRATION COMMANDS         //
//#############################################################//
//#############################################################//

module.exports.run = async (MAIN, message) => {

  // DEFINE VARIABLES
  let prefix = MAIN.config.PREFIX;

  // CHECK IF THE MESSAGE IS FROM A BOT
  if(message.author.bot == true){ return; }
  switch(message.channel.type){
    case  'dm':
    default:

  }

  // CHECK EACH DISCORD FOR THE SUB CHANNEL
  MAIN.Discord.Servers.forEach((server,index) => {
    if(message.channel.id == server.sub_channel){

      // DELETE THE MESSAGE
      message.delete();

      // // FETCH THE GUILD MEMBER AND CHECK IF A DONOR
      // let member = MAIN.guilds.get(messag).members.get(message.member.id);
      // if(member.hasPermission('ADMINISTRATOR')){ /* DO NOTHING */ }
      // else if(server.donor_role && !member.roles.has(server.donor_role)){ return; }

      // LOAD DATABASE RECORD
      MAIN.database.query("SELECT * FROM pokebot.users WHERE user_id = ? AND discord_id = ?", [message.member.id,server.id], function (error, user, fields) {
        // CHECK IF THE USER HAS AN EXISTING RECORD IN THE USER TABLE
        if(!user || !user[0]){ MAIN.Save_Sub(message,server); }
        else if(user[0].discord_id != message.guild.id){
          return message.reply('You cannot have a subscription in multiple discords that this bot resides.')
        }
        else{

          // FIND THE COMMAND AND SEND TO THE MODULE
          let command = '';
          switch(true){
            case message.content == prefix+'pause': command = 'pause'; break;
            case message.content == prefix+'resume': command = 'resume'; break;
            case message.content == prefix+'help': command = 'help'; break;
            case message.content == prefix+'p':
            case message.content == prefix+'pokemon': command = 'pokemon'; break;
            case message.content == prefix+'r':
            case message.content == prefix+'raid': command = 'raid'; break;
            case message.content == prefix+'q':
            case message.content == prefix+'quest': command = 'quest'; break;
            case message.content == 'restart':
              if(message.member.hasPermission('ADMINISTRATOR')){ process.exit(1).catch(console.error); } break;
            case message.content == 'reload':
              MAIN.start('reload'); break;
            default: command = message.content.slice(prefix.length);
          }

          let cmd = MAIN.Commands.get(command);
          if(cmd){
              if (!(message.member.roles.has(server.donor_role))) {return message.channel.send('<@' + message.member.id + '>, '+MAIN.config.TEXTS.NONDONOR).then(m => m.delete(10000)).catch(console.error);}
            return cmd.run(MAIN, message, prefix, server); 
          }
        }
      });
    }
  }); return;
}
