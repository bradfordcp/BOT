BOT
===
BOT is an extendable XMPP bot. This tool sits in group chats on a Jabber server 
listening to conversations happening around/to it. Upon seeing a message it 
fires a call into registered plugins looking for a match to the message. Should
one be found its method is called and the appropriate action is required.

Plugins may register themselves quite easily and a simple API is provided for
sending messages to the monitored room.

Where Am I?
===========
Currently BOT is starting up the XMPP streams and negotiating through the 
STARTTLS sequence. Next up is authentication.

