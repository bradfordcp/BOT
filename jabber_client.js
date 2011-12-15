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
   * _Note: This **may** be provided during the connection process, but not 
   * necessarily accepted by jabber server. Should it be rejected the approved
   * value will be stored here._
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
  
  if(false === (this instanceof JabberClient)) {
    return new JabberClient();
  }
  
  // Set up our emitter
  events.EventEmitter.call(this);
}
util.inherits(JabberClient, events.EventEmitter);

/**
 * JabberClient.stream_factory -> StreamFactory
 * 
 * Helper for generating XML Stream stanzas conforming to the XMPP protocol.
 * This is shared as we do not have any linking between the functions in the
 * helper.
 **/
JabberClient.prototype.stream_factory = require('./stream_factory.js');

/**
 * JabberClient.xml_parser -> xml2js.Parser
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
 * JabberClient.register_stream_handlers -> null
 * 
 * Registers internal handlers for socket events on the active connection.
 **/
JabberClient.prototype.register_stream_handlers = function () {
  var self = this;
  
  this.connections.active.on('connect', function () {
    console.log('Client Connected');
    
    var start_stream = self.stream_factory.start_stream(self.connection_information.username, self.connection_information.domain);
    console.log('Starting Starting Stream', start_stream);
    
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
      self.parser.parseString(response, function (err, payload) {
        if (err) {
          console.log("ERROR PARSING XML: ", response);
          return;
        }
        
        console.log(payload);
        
        // Handle various states, in the future have hooks where classes register for messages they are interested in.
        if (payload) {
          //handle_payload(payload);
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
  });
}

// Export our class
module.exports = JabberClient;
