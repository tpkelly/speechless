# Speechless bot
A Discord bot to allow text channels to be hidden until a user joins a related voice channel, and removed when the user leaves the voice channel

## Setup
Commands must be run by users with the Manage Channels permission.
Any users with a role giving them 'View Channel' on the text channel will be unaffected. This can be set to a Moderator role to still moderate the channel without having to be in the voice call at the time.
Bot itself requires:
- Server-wide permissions of Manage Channels (allow settings to be changed on channels)
- Read/Send Messages (to respond to commands)
- View Channel on any channels you intend to use this for
- Either server-wide Manage Roles, or channel-specific Manage Permissions to add/remove users from channels

## Commands
- /sl.help: Display this message
- /sl.add <voiceId> <textId>: Enable a text channel as a no-voice text channel for a voice channel
- /sl.remove <voiceId> <textId>: Remove the mapping between a no-voice text channel and a voice channel
- /sl.report: Send a DM to the creator of the bot about an issue or feedback
