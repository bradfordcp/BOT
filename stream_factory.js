/**
 * class StreamFactory
 * 
 * Provides a simple interface to generate XML for XMPP Streams
 **/

// Load up the XML builder module
var xmlbuilder = require('xmlbuilder');

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
 * StreamFactory#auth_plain([password]) -> String
 * - password (String): Password we are authenticating with in plain text
 *
 * Generates the auth stanza used with plain authentication methods
 **/
exports.auth_plain = function (password) {
  var stream_doc = xmlbuilder.create();
  
  // Create the starttls element
  var auth = stream_doc.begin('auth');
  auth.att('xmlns', 'urn:ietf:params:xml:ns:xmpp-sasl');
  auth.att('mechanism', 'PLAIN');
  if (password) auth.text(password);
  
  return stream_doc.toString();
}
