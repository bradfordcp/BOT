#!/usr/bin/env node

var username = process.argv[2];
var domain = process.argv[2];
var jabber_server = 'talk.google.com';

// Require the net module
var net = require('net');

// Require TLS/SSL
var tls = require('tls');

// Require the xml parsing library and create a parser
var xml2js = require('xml2js');
var parser = new xml2js.Parser({explicitRoot: true});

// Require the stream factory
var stream_factory = require('./stream_factory.js');

// Create a placeholder for out secure_client
var secure_client = null;

// Fire up the insecure_client
var insecure_client = net.connect(5222, jabber_server);

// When our socket connects we start the stream
insecure_client.on('connect', function () {
  console.log('Insecure Client connected');
  
  var start_stream = stream_factory.start_stream(username, domain);
  console.log('Starting Insecure Stream', start_stream);
  
  insecure_client.write(start_stream);
});

// Global handler of messages from the insecure socket
insecure_client.on('data', function (data) {
  console.log ('Insecure Received Data!');
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
  
  console.log("========================================================")
});

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
    insecure_client.write(start_tls);
  }
}

// Handles proceed responses (used to start TLS)
function handle_proceed(proceed_payload) {
  console.log('Received Proceed, starting tls connection');
}