[![Top.gg](https://top.gg/api/widget/status/814716537109217311.svg)](https://top.gg/bot/814716537109217311)
[![Top.gg](https://top.gg/api/widget/servers/814716537109217311.svg)](https://top.gg/bot/814716537109217311)

# Speechless
A Discord bot to allow text channels to be hidden until a user joins a related voice channel, and removed when the user leaves the voice channel.

![Show/Hide channels as you join](https://i.gyazo.com/7eb800853fe2e5d26637d2c82080bd3e.gif)

*Show/Hide channels as you join*

* Great help for those with robotic voices on bad connections
* Lets users get more involved in voice chat when they have to stay muted
* Keeps the server clean, while still allowing the channels to be moderated 

[Invite to your server](https://discordapp.com/oauth2/authorize?client_id=814716537109217311&permissions=268438528&scope=bot)

## Setup
- Commands must be run by users with the Manage Channels permission.
- Target text channel should have 'View Channel' permission denied for most users removed except for Moderators/Admins.
- Bot must have all permissions as listed below

## Required Bot Permissions
- Read/Send Messages (to respond to commands)
- View Channel on any channels you intend to use this for
- Either server-wide Manage Roles, or channel-specific Manage Permissions to add/remove users from channels

## Commands
- /sl.help: Display this message
- /sl.add \<voiceId\> \<textId\>: Enable a text channel as a no-voice text channel for a voice channel
- /sl.remove \<voiceId\>: Remove the mapping on a voice channel
- /sl.list: List out all current mappings in the current server
- /sl.support: Display information about bot support resources 
