/**
 * class StreamFactory
 * 
 * Provides a simple interface to generate XML for XMPP Streams
 **/

// Load up the XML builder module
var xmlbuilder = require('xmlbuilder');

/**
 * StreamFactory.SHOW_STATES = {}
 * A List of all show states available for presence
 * 
 * - AWAY: User is temporarily away
 * - CHAT: User is available for chatting
 * - DND: **Do Not Disturb**
 * - XA: User is gone for an eXtended Away
 **/
exports.SHOW_STATES = {
  AWAY: 'away',
  CHAT: 'chat',
  DND: 'dnd',
  XA: 'xa'
};

/**
 * StreamFactory#start_stream(from, to[, language]) -> String
 * - from (String): Username and domain of the connecting entity
 * - to (String): Domain of the talk server you are opening a connection to
 * - language (String): Two-character representating of the language being used
 * 
 * Generates the stream opening tag. We manually remove the /> and replace it with > in order to keep the tag open
 **/
exports.start_stream = function (from, to, language) {
  if (language == undefined) language = 'en';
  
  var stream_doc = xmlbuilder.create();

  // Create the root stream element
  var stream = stream_doc.begin('stream:stream', {version: '1.0'});
  
  // Add the appropriate attributes
  stream.att('from', from);
  stream.att('to', to);
  stream.att('xml:lang', language);
  stream.att('version', '1.0');
  stream.att('xmlns', 'jabber:client');
  stream.att('xmlns:stream', 'http://etherx.jabber.org/streams');
  
  // Generate the fragment
  var str_start_stream = stream_doc.toString();
  
  // Remove the closing stanza as this xml stream needs to be kept open
  str_start_stream = str_start_stream.substr(0, str_start_stream.length - 2) + ">";
  
  return str_start_stream;
}

/**
 * StreamFactory#stop_stream() -> String
 * 
 * Generates the stream closing tag. This is just static text.
 **/
exports.stop_stream = function () {
  return '</stream:stream>';
}

/**
 * StreamFactory#start_tls() -> String
 * 
 * Generates XML to start the TLS handshake
 **/
exports.start_tls = function () {
  var stream_doc = xmlbuilder.create();
  
  // Create the starttls element
  var starttls = stream_doc.begin('starttls');
  starttls.att('xmlns', 'urn:ietf:params:xml:ns:xmpp-tls');
  
  return stream_doc.toString();
}

/**
 * StreamFactory#auth_plain([username][, password]) -> String
 * - username (String): Username we are authenticating with in plain text
 * - password (String): Password we are authenticating with in plain text
 *
 * Generates the auth stanza used with plain authentication methods
 **/
exports.auth_plain = function (username, password) {
  var stream_doc = xmlbuilder.create();
  
  // Create the starttls element
  var auth = stream_doc.begin('auth');
  auth.att('xmlns', 'urn:ietf:params:xml:ns:xmpp-sasl');
  auth.att('mechanism', 'PLAIN');
  if (username && password) auth.text(new Buffer("\0" + username + "\0" + password).toString('base64'));
  
  return stream_doc.toString();
}

/**
 * StreamFactory#bind(request_id[, resource]) -> String
 * - request_id (String): Request identifier
 * - resource (String): Client generated resource identifier
 *
 * Generates the bind stanza for use with the bind stream feature
 **/
exports.bind = function (request_id, resource) {
  var stream_doc = xmlbuilder.create();
  var iq = stream_doc.begin('iq');
  iq.att('type', 'set');
  iq.att('id', request_id);
  
  var bind = iq.ele('bind');
  bind.att('xmlns', 'urn:ietf:params:xml:ns:xmpp-bind');
  
  if (resource) {
    bind.ele('resource').text(resource);
  }
  
  return stream_doc.toString();
}

/**
 * StreamFactory#roster(request_id, jid) -> String
 * - request_id (String): Request identifier
 * - jid (String): JID provided by the server
 *
 * Generates the roster request to see who is online
 **/
exports.roster = function (request_id, jid) {
  var stream_doc = xmlbuilder.create();
  var iq = stream_doc.begin('iq');
  iq.att('type', 'get');
  iq.att('id', request_id);
  iq.att('from', jid)
  
  iq.ele('query').att('xmlns', 'jabber:iq:roster');
  
  return stream_doc.toString();
}

/**
 * StreamFactory#presence(request_id, jid, show[, status]) -> String
 * - request_id (String): Request identifier
 * - jid (String): JID provided by the server
 * - show (String): Availability sub-state may be any SHOW_STATES value
 * - status (String): Optional natural language describing the currently shown state
 * 
 * Generates the presence request to indicate a presence
 **/
exports.presence = function (request_id, jid, show, status) {
  var stream_doc = xmlbuilder.create();
  var presence = stream_doc.begin('presence');
  presence.att('from', jid);
  presence.att('id', request_id);
  presence.ele('show').text(show);
  
  if (status) {
    presence.ele('status').text(status);
  }
  
  return stream_doc.toString();
}

/**
 * StreamFactory#message(jid, to, body[, lang]) -> String
 * - jid (String): JID provided by the server
 * - to (String): jid or username@domain the message is being sent to
 * - body (String): Body of the message
 * - lang (String): 2 character language identifier
 * 
 * Generates the message XML stanza
 **/
exports.message = function (jid, to, body, lang) {
  var stream_doc = xmlbuilder.create();
  var message = stream_doc.begin('message');
  message.att('from', jid);
  message.att('to', to);
  
  if (lang) {
    message.att('xml:lang', lang);
  }
  else {
    message.att('xml:lang', 'en');
  }
  
  message.ele('body').text(body);
  
  return stream_doc.toString();
}

