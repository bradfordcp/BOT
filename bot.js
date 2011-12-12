#!/usr/bin/env node

var jabber_username = null;
var jabber_domain = null;
var jabber_server = null;
var jabber_password = null;

var program = require('commander');

program
  .version('0.0.1')
  .option('--jabber_username [jabber_username]', 'Default Jabber Username')
  .option('--jabber_password [jabber_password]', 'Default Jabber Password')
  .option('--jabber_domain [jabber_domain]', 'Default Jabber Domain')
  .option('--jabber_hostname [jabber_hostname]', 'Default Jabber Hostname')
  .parse(process.argv)

process.stdin.resume();
check_username();

function check_username() {
  if (program.jabber_username) {
    jabber_username = program.jabber_username;
    
    check_domain();
  }
  else {
    prompt_username();
  }
}

function prompt_username() {
  program.prompt('Jabber Username: ', function (user) {
    jabber_username = user;
    
    check_domain();
  });
}

function check_domain() {
  if (program.jabber_domain) {
    jabber_domain = program.jabber_domain;
    
    check_server();
  }
  else {
    prompt_domain();
  }
}

function prompt_domain() {
  program.prompt('Jabber Domain: ', function (domain) {
    jabber_domain = domain;
    
    check_server();
  });
}

function check_server() {
  if (program.jabber_hostname) {
    jabber_server = program.jabber_hostname;
    
    check_password();
  }
  else {
    prompt_server();
  }
}

function prompt_server() {
  program.prompt('Jabber Hostname: ', function (host) {
    jabber_server = host;
    
    check_password();
  });
}

function check_password() {
  if (program.jabber_password) {
    jabber_domain = program.jabber_password;
    
    start_jabber_connection()
  }
  else {
    prompt_password();
  }
}

function prompt_password() {
  program.password('Jabber Password: ', function (pass) {
    jabber_password = pass;
    process.stdin.destroy();
    
    start_jabber_connection();
  });
}

function start_jabber_connection() {
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
  var client = net.connect(5222, jabber_server);
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
      if (response.substr(0, 14) == '<stream:stream') {
        console.log("Start stream, automatically close element");
        
        // Automatically close the element as to not confuse our parser
        response = response + "</stream:stream>";
      }
      
      // Parse the XML payload
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
        //var auth = stream_factory.auth_plain(new Buffer(jabber_password).toString('base64'));
        var auth = stream_factory.auth_plain();
        
        console.log(auth);
        client.write(auth);
//        client.write(new Buffer(auth).toString('base64'));
      }
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
}

