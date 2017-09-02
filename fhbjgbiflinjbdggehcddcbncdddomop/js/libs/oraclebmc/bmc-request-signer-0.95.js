/*
BMC RequestSigner v0.95
code.cpet.oracle.com/p/oraclebmc/bmc-request-signer-js
(c) 2009-2017 by Mike Wooten. All rights reserved.
code.cpet.oracle.com/p/oraclebmc/bmc-request-signer-js/wiki/License
This code uses jsrsasign (http://kjur.github.io/jsrsasign/)
*/
;(function(root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(['crypto-js/core', 'crypto-js/sha256', 'crypto-js/hmac-sha256'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('crypto-js/core'),
      require('crypto-js/sha256'),
      require('crypto-js/hmac-sha256')
    );
  } else {
    root.bmc = factory(KJUR);
  }
}(this, function (KJUR) {
	'use strict';

	var RequestSigner = function (privateKeyPEM) {
		this.privateKeyPEM = privateKeyPEM;
		this.headers = {};
	};

	/**
	* <p>Signs parts of HTTP request using the RSA-SHA256 algorithm.</p>
	* @param {object} context	Read-only object for request context
	* @param {object} request	Read-only object for request to create signature for
	* @returns Signature to be assigned to Authorization HTTP request header.
	*/
	RequestSigner.prototype.sign = function (context, request) {
		var verb = request.method.toLowerCase();

		var headersToSign = [
			"date", 
			"(request-target)",
			"host"
		];

		// Add additional items to headersToSign Array
		// object, if it's a POST or PUT request
		switch(verb) {
			case "put":
			case "post":
				headersToSign.push("content-type");
				headersToSign.push("content-length");
				if (request.dataMode == "raw") headersToSign.push("x-content-sha256");
		}

		var headerHash = buildHeaderHash(this, headersToSign, context, request);
		var signingBase = calculateSignature(headersToSign, headerHash);
 		var signatureHeader = buildSignatureHeader(this, context, signingBase, headersToSign);

		return signatureHeader;
	};

//private:
	function buildHeaderHash(self, headersToSign, context, request){
		var verb = request.method.toLowerCase();

		self.headers = {
			DATE : new Date().toGMTString(),
			REQUEST_TARGET : verb+' '+request.url.pathname+request.url.search+request.url.hash,
			OPC_REQUEST_ID : UUID()
		};

		var headerHash = {
			date : self.headers["DATE"],
			'(request-target)' : self.headers["REQUEST_TARGET"],
			host : request.url.host
		};

		// If it's an OPTIONS request, just return null
		// because there's nothing that needs signing
		if (verb == "options") return null;

		// If it's a POST or PUT request, additional processing
		// needs to occur.
		if ("post,put".indexOf(verb) !== -1) {
			var md;
			// "raw" dataMode means we're not working with a request for object 
			// storage API. "binary" dataMode means we're working with a request
			// for object storage.

			if (request.dataMode == "raw") {
				// Get a SHA256 message digest
 				md = new KJUR.crypto.MessageDigest({"alg": "sha256", "prov": "cryptojs"});
				// Update SHA256 message digest using stringified request body
				md.updateString(request.data.toString());

				// Set environment variables associated with header values
				// for POST and PUT requests
				self.headers["X_CONTENT_SHA256"] = hextob64(md.digest()); 
				self.headers["CONTENT_LENGTH"] = request.data.length;

				// Add additional items to headerHash object
				headerHash['x-content-sha256'] = self.headers["X_CONTENT_SHA256"]; 
				headerHash['content-type'] = request.headers["Content-Type"]; 
				headerHash['content-length'] = self.headers["CONTENT_LENGTH"];
			} else if (request.dataMode == "binary") {
				// Set environment variables associated with header values
				// for POST and PUT requests
				self.headers["CONTENT_LENGTH"] = request.data.length;

				// Add additional items to headerHash object
				headerHash['content-type'] = request.headers["Content-Type"]; 
				headerHash['content-length'] = self.headers["CONTENT_LENGTH"]; 
			} else {
				throw "Unsupported body_mode: "+request.dataMode;
			}
		}

		return headerHash;
	}

	function calculateSignature(headersToSign, headerHash) {
		var signingBase = '';
		headersToSign.forEach(function(h){
 			if (signingBase !== '') { signingBase += '\n'; }
			signingBase += h.toLowerCase() + ": " + headerHash[h];
		});

		return signingBase;
	}

	function buildSignatureHeader(self, context, signingBase, headersToSign) {
		var sig = new KJUR.crypto.Signature({"alg": "SHA256withRSA"});
		sig.init(self.privateKeyPEM);
		var hSigVal = sig.signString(signingBase);
 		var header = [
 			"Signature algorithm=\"rsa-sha256\"",
			"headers=\""+headersToSign.join(' ')+"\"",
			"keyId=\""+context["API_TENANCY"]+"/"+context["API_USER"]+"/"+context["API_FINGERPRINT"]+"\"",
			"signature=\""+hextob64(hSigVal)+"\"",
			"version=\"1\""
		];
		return header.join();
	}

	// Throw an error if the given object is undefined.
	function assertRequired(obj, msg) {
		if (typeof(obj) === 'undefined' || !obj) {
			throw new Error(msg);
		}
	}

	function UUID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});
		return uuid;
	}

	return {
		RequestSigner: RequestSigner
	};
}));
