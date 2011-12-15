/**
 * class JabberClient
 * 
 * Provides a simple interface with a remote jabber server.
 **/

// Bring in the sys module
var util = require('util');

// We will be emitting event, bring in the events lib
var events = require('events');

// Require the net module
var net = require('net');

// Require TLS/SSL
var tls = require('tls');

// TLS Helpers
var starttls = require('./starttls.js');

// XML Parsing
var xml2js = require('xml2js');

/**
 * new JabberClient(username, domain, password, hostname[, port])
 * - username (String): Username we are connecting to the jabber service with
 * - domain (String): Domain the user resides within
 * - password (String): Plain text of the user's password
 * - hostname (String): Hostname of the jabber server
 * - port (Number): Port number of the jabber server
 * 
 * Initializes a JabberClient 
 **/
function JabberClient(username, domain, password, hostname, port) {
  /** 
   * JabberClient#connection_information -> Object
   * 
   * Provides a hash for storing connection information.
   * 
   * - username: Username to connect with
   * - domain: Domain where the username resides
   * - password: Password to use during authentication
   * - hostname: Jabber server used during connection
   * - port: Port the jabber server is running on _Default: 5222_
   **/
  this.connection_information = {
    username: username,
    domain: domain,
    password: password,
    hostname: hostname,
    port: 5222
  };
  
  if (port) {
    this.connection_information.port = port;
  }
  
  /**
   * JabberClient#connections -> Object
   * 
   * Hash for storing different classes of connection
   * 
   * - secure: Secure stream created after establishing SSL / TLS
   * - insecure: Raw stream used prior to TLS handshake. This will **NOT** 
   *   recieve events after secure is established.
   * - active: Points to one of the other connections in this stream depending
   *   on which one is currently active / should be used.
   **/
  this.connections = {
    secure: null,
    insecure: null,
    active: null
  }
  
  /**
   * JabberClient#jid -> String
   * 
   * Resource identifer bound on the client and server. 
   * 
   * _Note: This **may** be provided during the connection process, but not_ 
   * _necessarily accepted by jabber server. Should it be rejected the approved_
   * _value will be stored here._
   **/
  this.jid = "";
  
  /**
   * JabberClient#requests -> Object
   *
   * Hash containing all _named_ requests and their responses. A request is
   * _named_ if the function generates an XML stanza complete with a unique id
   * attribute. When the response comes in we parse it and place the processed
   * data in the same named section and fire any request specific callbacks.
   * 
   * Element data structure:
   * =======================
   * - request (String): Generated XML sent to the jabber server
   * - response (Object): Parsed XML object returned by the jabber server
   * - callback (Function): Function called when the response is retrieved. The
   *   the entire element is passed in as an argument
   * 
   * The data structure is keyed by the unique id used within the request.
   **/ 
  this.requests = {};
  
  // Register the local event listeners
  this.register_event_handlers();
  
  if(false === (this instanceof JabberClient)) {
    return new JabberClient();
  }
  
  // Set up our emitter
  events.EventEmitter.call(this);
}
util.inherits(JabberClient, events.EventEmitter);

/**
 * JabberClient#stream_factory -> StreamFactory
 * 
 * Helper for generating XML Stream stanzas conforming to the XMPP protocol.
 * This is shared as we do not have any linking between the functions in the
 * helper.
 **/
JabberClient.prototype.stream_factory = require('./stream_factory.js');

/**
 * JabberClient#xml_parser -> xml2js.Parser
 * 
 * Global XML parser for use across clients and connections.
 **/
JabberClient.prototype.parser = new xml2js.Parser({explicitRoot: true});

/** 
 * JabberClient#connect() -> null
 * 
 * Initiate a connection to the jabber server
 **/
JabberClient.prototype.connect = function () {
  this.connections.insecure = net.connect(this.connection_information.port, this.connection_information.hostname);
  this.connections.active = this.connections.insecure;
  
  this.register_stream_handlers();
}

/**
 * JabberClient#register_stream_handlers -> null
 * 
 * Registers internal handlers for socket events on the active connection.
 **/
JabberClient.prototype.register_stream_handlers = function () {
  var self = this;
  
  this.connections.active.on('connect', function () {
    console.log('Client Connected');
    
    var start_stream = self.stream_factory.start_stream(self.connection_information.username, self.connection_information.domain);
    console.log('Starting Stream', start_stream);
    
    self.connections.active.write(start_stream);
  });
  
  this.connections.active.on('data', function (data) {
    console.log ('Client Received Data!');
    var response = data.toString('utf8');
    
    // Strip out xml doc declarations
    response = response.replace("<?xml version='1.0' encoding='UTF-8'?>", "");
    
    // Share our response
    console.log(response);
    
    // Check to see if this is the start of a stream
    if (response.substr(0, 14) == '<stream:stream') {
      console.log("Start stream, automatically close element");
      
      // Automatically close the element as to not confuse our parser
      response = response + "</stream:stream>";
    }
    
    try{
      self.parser.parseString(response, function (err, decoded_response) {
        if (err) {
          return;
        }
        
        console.log(decoded_response);
        
        // Handle various states, in the future have hooks where classes register for messages they are interested in.
        if (decoded_response) {
          self.route_response(decoded_response);
        }
        else {
          // This was a null data response :(
          console.log("NULL Data Response");
        }
      });
    } catch (err) {
      console.log("ERROR RECEIVED!");
      console.log(err);
      process.exit();
    }
  });
}

/**
 * JabberClient#route_response(response) -> null
 * - response (Object): Parsed XML
 * 
 * fires stream:stream, stream:features
 * 
 * Generates and emits the approriate events based off of the returned response.
 **/
JabberClient.prototype.route_response = function (response) {
  var self = this;
  
  // If there is an 'id' related to this response _and_ we have a request with that id. Fire off its callback first.
  if (response['@'] && response['@']['id']) {
    var response_id = response['@']['id'];
    if (self.requests[response_id]) {
      self.requests[response_id].response = response;
      
      if (self.requests[response_id].callback) self.requests[response_id].callback();
    }
  }
  
  var keys = [];
  for (var key in response) {
    if (response.hasOwnProperty(key)) {
      keys.push(key);
      
      // For each key that is at the root level and not '@' (our attribute helper) fire off an event with that value
      if (response[key]['@'] && response[key]['@']['id']) {
        var response_id = response[key]['@']['id'];
        if (self.requests[response_id]) {
          console.log('Matched named request, storing result');
          self.requests[response_id].response = response;
          
          if (self.requests[response_id].callback) {
            console.log('Firing specified callback')
            self.requests[response_id].callback(response);
            break;
          }
        }
      }
      
      console.log('Firing: ', key);
      self.emit(key, response[key]);
    }
  }
}

/**
 * JabberClient#register_event_handlers() -> null
 * 
 * Registers handlers for the events emitted by the response router.
 **/
JabberClient.prototype.register_event_handlers = function () {
  var self = this;
  
  // Process the opening of a stream, passing along stream:features
  self.on('stream:stream', function (response) {
    console.log('Handling Stream');
    
    if (response['stream:features']) {
      console.log('Firing: ', 'stream:features');
      self.emit('stream:features', response['stream:features']);
    }
  });
  
  // Emit all stream:features provided, breaking on starttls
  self.on('stream:features', function (response) {
    for (var key in response) {
      if (key != '@' && response.hasOwnProperty(key)) {
        console.log('stream:feature: ', key);
        
        self.emit(key, response[key]);
        
        if (key == 'starttls') return; // Stop processing until we handle tls negotiation
      }
    }
  });
  
  // Start the TLS handshake
  self.on('starttls', function (response) {
    var start_tls = self.stream_factory.start_tls();
    console.log('Starting TLS', start_tls);
    self.connections.active.write(start_tls);
  });
  
  // Proceed with the TLS handshake and authorization
  self.on('proceed', function (response) {
    // Remove listeners from the insecure connection
    self.connections.insecure.removeAllListeners();
    
    // Start up a new secure connection (over the open socket)
    self.connections.secure = starttls(self.connections.insecure, {}, function () {
      console.log("In Callback, Emitting connect call");
      self.connections.active.emit('connect');
    });
    self.connections.active = self.connections.secure;
    
    // Re-register stream handlers as we have a new active connection
    self.register_stream_handlers();
  });
  
  // Process authentication mechanisms (currently PLAIN is supported)
  self.on('mechanisms', function (response) {
    console.log('Interrogating Mechanisms', response['mechanism']);
      var plain_supported = false;
      for (var i in response['mechanism']) {
        var mechanism = response['mechanism'][i];
        if (mechanism == 'PLAIN') {
          plain_supported = true;
          break;
        }
      }
      
      if (plain_supported) {
        // Send the auth command
        console.log("PLAIN Supported");
        var auth = self.stream_factory.auth_plain(self.connection_information.username, self.connection_information.password);
        
        console.log('Authenticating: ', auth);
        self.connections.active.write(auth);
      }
  });
  
  // Handle a successful authentication and start the new stream
  self.on('success', function (response) {
    // Start another stream
    var start_stream = self.stream_factory.start_stream(self.connection_information.username, self.connection_information.domain);
    console.log('Starting Secure Authenticated Stream', start_stream);
    
    self.connections.active.write(start_stream);
  });
  
  // Process a bind feature and it's response
  self.on('bind', function (response) {
    console.log("bind supported");
    self.requests['bind_1'] = {
      request: self.stream_factory.bind('bind_1'),
      callback: function (response) {
        //Store our jid and emit the 'connect' event as our process is complete
        if (response['iq'] && response['iq']['bind'] && response['iq']['bind']['jid']) {
          self.jid = response['iq']['bind']['jid'];

          self.emit('connect');
        }
      }
    };
    
    console.log(self.requests['bind_1'].request);
    self.connections.active.write(self.requests['bind_1'].request);
  });
}

/**
 * JabberClient#presence(show[, status]) -> null
 * - show (String): Availability sub-state may be any SHOW_STATES value
 * - status (String): Optional natural language describing the currently shown state
 * 
 * Sets the current presence
 **/
JabberClient.prototype.presence = function (show, status) {
  var self = this;
  
  if (this.jid) {
    this.requests['presence_1'] = {
      request: this.stream_factory.presence('presence_1', this.jid, show, status)
    };
    
    console.log("Sending Presence: ", this.requests['presence_1'].request);
    this.connections.active.write(this.requests['presence_1'].request);
  }
}

/**
 * JabberClient#roster([callback]) -> null
 * - callback (function): Callback function to be called when the request is completed
 * 
 * Performs the roster query call.
 **/
JabberClient.prototype.roster = function (callback) {
  var self = this;
  
  if (this.jid) {
    this.requests['roster_1'] = {
      request: this.stream_factory.roster('roster_1', this.jid)
    };
    
    if (callback) this.requests['roster_1'].callback = callback;
      
    console.log("Sending Roster: ", this.requests['roster_1'].request);
    this.connections.active.write(this.requests['roster_1'].request);
  }
}

/**
 * JabberClient#message(to, body[, lang]) -> null
 * - to (String): jid or username@domain the message is being sent to
 * - body (String): Body of the message
 * - lang (String): 2 character language identifier
 * 
 * Sets the current presence
 **/
JabberClient.prototype.message = function (to, body, lang) {
  var self = this;
  
  if (this.jid) {
    var message = this.stream_factory.message(this.jid, to, body, lang);
    console.log('Sending Message', message);
    this.connections.active.write(message);
  }
}

// Export our class
module.exports = JabberClient;
