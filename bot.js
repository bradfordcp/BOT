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

check_password();

function check_password() {
  if (program.jabber_password) {
    jabber_password = program.jabber_password;
    
    if (jabber_username && jabber_password && jabber_domain && jabber_hostname) {
      start_jabber_connection();
    }
    else {
      console.log('Missing connection information. Please see the help information');
      process.exit();
    }
  }
  else {
    prompt_password();
  }
}

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
  // Object for tracking requests
  var requests = {};
  
  // Resource identifier for our connection
  var jid = null;
  
  // Require the net module
  var net = require('net');

  // Require TLS/SSL
  var tls = require('tls');

  // TLS Helpers
  var starttls = require('./starttls.js');

  // Require the xml parsing library and create a parser
  var xml2js = require('xml2js');
  var parser = new xml2js.Parser({explicitRoot: true});

  // Require the stream factory
  var stream_factory = require('./stream_factory.js');

  // Fire up the client
  var old_client = null;
  var client = net.connect(5222, jabber_hostname);
  register_insecure_client_handlers();

  // Register insecure handlers
  function register_insecure_client_handlers() {
    // When our socket connects we start the stream
    client.on('connect', function () {
      console.log('Insecure Client Connected');
      
      var start_stream = stream_factory.start_stream(jabber_username, jabber_domain);
      console.log('Starting Insecure Stream', start_stream);
      
      client.write(start_stream);
    });

    // Global handler of messages from the insecure socket
    client.on('data', function (data) {
      console.log ('Insecure Received Data!');
      var response = data.toString('utf8');
      console.log(response);
      
      // Check to see if this is the start of a stream
      response = response.replace("<?xml version='1.0' encoding='UTF-8'?>", "");
      if (response.substr(0, 14) == '<stream:stream') {
        console.log("Start stream, automatically close element");
        
        // Automatically close the element as to not confuse our parser
        response = response + "</stream:stream>";
      }
      
      // Parse the XML payload
      try{
        parser.parseString(response, function (err, payload) {
          if (err) {
            console.log("ERROR PARSING XML: ", response);
            return;
          }
          
          console.log(payload);
          
          // Handle various states, in the future have hooks where classes register for messages they are interested in.
          if (payload) {
            handle_payload(payload);
          }
          else {
            // This was a null data response :(
          }
        });
      } catch (err) {
        console.log("ERROR RECEIVED!");
        console.log(err);
        process.exit();
      }
      
      console.log("========================================================");
    });
  }

  // Register secure handlers
  function register_secure_client_handlers() {
    // When our socket connects we start the stream
    client.on('connect', function () {
      console.log('Secure Client Connected');
      
      var start_stream = stream_factory.start_stream(jabber_username, jabber_domain);
      console.log('Starting Secure Stream', start_stream);
      
      client.write(start_stream);
    });

    // Global handler of messages from the insecure socket
    client.on('data', function (data) {
      console.log ('Secure Received Data!');
      var response = data.toString('utf8');
      console.log(response);
      
      // Check to see if this is the start of a stream
      response = response.replace("<?xml version='1.0' encoding='UTF-8'?>", "");
      if (response.substr(0, 14) == '<stream:stream') {
        console.log("Start stream, automatically close element");
        
        // Automatically close the element as to not confuse our parser
        response = response + "</stream:stream>";
      }
      
      // Parse the XML payload
      try {
        parser.parseString(response, function (err, payload) {
          if (err) {
            console.log("ERROR PARSING XML: ", response);
            return;
          }
          
          console.log(payload);
          
          // Handle various states, in the future have hooks where classes register for messages they are interested in.
          if (payload) {
            handle_payload(payload);
          }
          else {
            // This was a null data response :(
          }
        });
      } catch (err) {
        console.log("ERROR RECEIVED!");
        console.log(err);
        process.exit();
      }
      
      console.log("========================================================");
    });
  }

  // Generic handler
  function handle_payload(payload) {
    if (payload['stream:stream']) {
      handle_stream(payload['stream:stream']);
    }
    else if (payload['stream:features']) {
      handle_features(payload['stream:features']);
    }
    else if (payload['proceed']) {
      handle_proceed(payload['proceed']);
    }
    else if (payload['success']) {
      handle_auth_success(payload['success']);
    }
    else if (payload['iq']) {
      // Store the result if this is "named"
      if (payload['iq']['@']['id'] && requests[payload['iq']['@']['id']]) {
        requests[payload['iq']['@']['id']].response = payload;
        
        if (requests[payload['iq']['@']['id']].callback) {
          requests[payload['iq']['@']['id']].callback(requests[payload['iq']['@']['id']]);
        }
      }
      
      if (payload['iq']['bind']) {
        // Process the bind result
        handle_bind(payload['iq']['bind']);
      }
      else if (payload['iq']['query']) {
        if (payload['iq']['query']['@']['xmlns']) {
          if (payload['iq']['query']['@']['xmlns'] == 'jabber:iq:roster') {
            // Handle the 
          }
        }
      }
    }
  }

  // Handles stream:stream responses
  function handle_stream(stream_payload) {
    console.log('Stream Started');
    
    if (stream_payload['stream:features']) {
      handle_features(stream_payload['stream:features']);
    }
  }

  // Handles stream:features responses
  function handle_features(features_payload) {
    console.log('Supported Features Received!');
    if (features_payload['starttls']) {
      // We are currently not sending over a secure channel, start that process
      var start_tls = stream_factory.start_tls();
      console.log('Starting TLS', start_tls);
      client.write(start_tls);
    }
    else if (features_payload['mechanisms'] && features_payload['mechanisms']['mechanism']) {
      console.log('Interrogating Mechanisms', features_payload['mechanisms']['mechanism']);
      var plain_supported = false;
      for (var i in features_payload['mechanisms']['mechanism']) {
        var mechanism = features_payload['mechanisms']['mechanism'][i];
        if (mechanism == 'PLAIN') {
          plain_supported = true;
          break;
        }
      }
      
      if (plain_supported) {
        // Send the auth command
        console.log("PLAIN Supported");
//        var auth = stream_factory.auth_plain(jabber_password);
        var auth = stream_factory.auth_plain(jabber_username, jabber_password);
//        var auth = stream_factory.auth_plain();
        
        console.log(auth);
        client.write(auth);
      }
    } else if (features_payload['bind']) {
      // Send the bind request
      console.log("bind supported");
      requests['bind_1'] = {
        request: stream_factory.bind('bind_1')
      };
      
      console.log(requests['bind_1'].request);
      client.write(requests['bind_1'].request);
    }
    
  }

  // Handles proceed responses (used to start TLS)
  function handle_proceed(proceed_payload) {
    console.log('Received Proceed, starting tls connection');
    
    // Unregister old handlers
    old_client = client;
    old_client.removeAllListeners();
    
    // Starttls
    client = starttls(client, {}, function () {
      console.log("In Callback, Emitting connect call");
      client.emit('connect');
    });
    
    // Register new handlers
    register_secure_client_handlers();
  }
  
  // Handles a successful authentication
  function handle_auth_success(success_payload) {
    // Start another stream
    var start_stream = stream_factory.start_stream(jabber_username, jabber_domain);
    console.log('Starting Secure Authenticated Stream', start_stream);
    
    client.write(start_stream);
  }
  
  // Handles a bind payload
  function handle_bind(bind_payload) {
    jid = bind_payload['jid'];
    
    // Fire off the roster request
    console.log("Bound, starting roster query");
    requests['roster_1'] = {
      request: stream_factory.roster('roster_1', jid)
    };
    
    console.log(requests['roster_1'].request);
    client.write(requests['roster_1'].request);
    
    // Fire off initial presence request
    console.log("Bound, sending presence");
    requests['presence_1'] = {
      request: stream_factory.presence('presence_1', jid, stream_factory.SHOW_STATES.CHAT, 'I am a Robot')
    };
    
    console.log(requests['presence_1'].request);
    client.write(requests['presence_1'].request);
  }
}

