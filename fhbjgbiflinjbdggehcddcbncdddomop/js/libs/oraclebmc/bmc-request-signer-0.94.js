/*
RequestSigner v0.94
code.cpet.oracle.com/p/oraclebmc/request-signer-js
(c) 2009-2017 by Mike Wooten. All rights reserved.
code.cpet.oracle.com/p/oraclebmc/request-signer-js/wiki/License
This code uses jsrsasign (http://kjur.github.io/jsrsasign/)
*/
function RequestSigner(privateKeyPEM) {
	this.privateKeyPEM = privateKeyPEM;
	this.headers = {};
}

RequestSigner.prototype.sign = function(context, request) {
	var verb = request.method.toLowerCase();

	var targetUrl = new URL(request.url
	.replace("{{API_HOST}}",context["API_HOST"])
	.replace("{{API_VERSION}}",context["API_VERSION"])
	.replace("{{TENANCY}}",context["API_TENANCY"])
	.replace("{{COMPARTMENT}}",context["API_COMPARTMENT"])
	.replace("{{NAMESPACE_NAME}}",context["STORAGE_NAMESPACE"])
	);

	this.headers = {
		DATE : new Date().toGMTString(),
		REQUEST_TARGET : verb+' '+targetUrl.pathname+targetUrl.search+targetUrl.hash,
		OPC_REQUEST_ID : UUID()
	};

	var headersToSign = [
		"date", 
		"(request-target)",
		"host"
	];

	var headerHash = {
		date : this.headers["DATE"],
		'(request-target)' : this.headers["REQUEST_TARGET"],
		host : context["API_HOST"]
	};

	// Add additional items to headersToSign Array
	// object, if it's a POST or PUT request
	switch(verb) {
		case "put":
		case "post":
			headersToSign.push("content-type");
			headersToSign.push("content-length");
	}

	// If it's an OPTIONS request, just return null
	// because there's nothing that needs signing
	if (verb == "options") return null;

	if ("post,put".indexOf(verb) !== -1) {
		var md;
		if (request.dataMode == "raw") {
			headersToSign.push("x-content-sha256");
 			md = new KJUR.crypto.MessageDigest({"alg": "sha256", "prov": "cryptojs"});
			md.updateString(request.data);

			// Set environment variables associated with header values
			// for POST and PUT requests
			this.headers["X_CONTENT_SHA256"] = hextob64(md.digest()); 
			this.headers["CONTENT_LENGTH"] = request.data.length;

			// Add additional items to headerHash object
			headerHash['x-content-sha256'] = this.headers["X_CONTENT_SHA256"]; 
			headerHash['content-type'] = request.headers["Content-Type"]; 
			headerHash['content-length'] = this.headers["CONTENT_LENGTH"];
		} else if (request.dataMode == "binary") {
			// Set environment variables associated with header values
			// for POST and PUT requests
			this.headers["CONTENT_LENGTH"] = request.data.length;

			// Add additional items to headerHash object
			headerHash['content-type'] = request.headers["Content-Type"]; 
			headerHash['content-length'] = this.headers["CONTENT_LENGTH"]; 
		} else {
			throw "Unsupported body_mode: "+request.dataMode;
		}
	}

	// compute sig here
	var signingBase = '';
	headersToSign.forEach(function(h){
 		if (signingBase !== '') { signingBase += '\n'; }
		signingBase += h.toLowerCase() + ": " + headerHash[h];
	});

	var sig = new KJUR.crypto.Signature({"alg": "SHA256withRSA"});
	sig.init(this.privateKeyPEM);
	var hSigVal = sig.signString(signingBase);

 	var atz_header = [
 		"Signature algorithm=\"rsa-sha256\"",
		"headers=\""+headersToSign.join(' ')+"\"",
		"keyId=\""+context["API_TENANCY"]+"/"+context["API_USER"]+"/"+context["API_FINGERPRINT"]+"\"",
		"signature=\""+hextob64(hSigVal)+"\"",
		"version=\"1\""
	];

	return atz_header.join();

//private:
	function UUID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});
		return uuid;
	}
};