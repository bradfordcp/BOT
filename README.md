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
Currently BOT is handling the following events:

- Open a socket to the XMPP Server
- Starts the XML Stream
- Starts TLS with the open socket (currently this is required behavior)
- Performs PLAIN authentication over the secure socket
- Binds on a resource
- Retrieves the roster
- Sets initial presence

Testing
=======
Currently I am manually testing behavior using my personal GMail / Google Talk 
account. In the near future I am looking to bring in Jasmine for some simple 
testing. Until then this functions against Google Talk servers.

Example
=======
./bot.js --jabber\_username _username_ --jabber\_domain _domain_ --jabber_hostname _hostname_

_Note: Functionality is limited while I push the spaghetti code mess of bot.js 
into a cleaner API / class (JabberClient)_
