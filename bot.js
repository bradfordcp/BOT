#!/usr/bin/env node

var jabber_username = null;
var jabber_domain = null;
var jabber_server = null;
var jabber_password = null;

var program = require('commander');

program
  .version('0.0.1')
  .option('--jabber_username [jabber_username]', 'Jabber Username')
  .option('--jabber_domain [jabber_domain]', 'Jabber User Domain')
  .option('--jabber_hostname [jabber_hostname]', 'Jabber Server Hostname')
  .parse(process.argv)

process.stdin.resume();

if (program.jabber_username) {
  jabber_username = program.jabber_username;
}
if (program.jabber_domain) {
  jabber_domain = program.jabber_domain;
}
if (program.jabber_hostname) {
  jabber_hostname = program.jabber_hostname;
}

var JabberClient = require('./jabber_client.js');
var client = null;

var matchers = [];
matchers.push({
  regex: new RegExp(/have a cookie/ig),
  response: "OM NOM NOM"
});
matchers.push({
  regex: new RegExp(/.*rules.*/ig),
  response: "A robot may not injure a human being or, through inaction, allow a human being to come to harm.\n\n" +
            "A robot must obey the orders given to it by human beings, except where such orders would conflict with the First Law.\n\n" +
            "A robot must protect its own existence as long as such protection does not conflict with the First or Second Laws."
});

prompt_password();

function prompt_password() {
  program.password('Jabber Password: ', function (pass) {
    jabber_password = pass;
    process.stdin.destroy();
    
    if (jabber_username && jabber_password && jabber_domain && jabber_hostname) {
      start_jabber_connection();
    }
    else {
      console.log('Missing connection information. Please see the help information');
      process.exit();
    }
  });
}

function start_jabber_connection() {
  client = new JabberClient(jabber_username, jabber_domain, jabber_password, jabber_hostname);
  client.connect();
  
  client.on('connect', client_connected);
  client.on('message', client_messaged);
}

function client_connected () {
  client.presence(client.stream_factory.SHOW_STATES.CHAT, 'I am a Robot');
  client.roster();
}

function client_messaged (response) {
  // Verify the message was to us
  if (response['@']['to'].substr(0, jabber_username.length) == jabber_username) {
    // Match the message
    for (var i in matchers) {
      var matcher = matchers[i];
      if (matcher.regex.test(response['body'])) {
        console.log('Matched: ', matcher);
        client.message(response['@']['from'], matcher.response);
        break;
      }
    }
  }
}

