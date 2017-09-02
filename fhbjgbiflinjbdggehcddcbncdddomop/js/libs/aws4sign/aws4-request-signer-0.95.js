/*
AWS v4 RequestSigner v0.95
code.paasdtools.oracle.com/postman/aws/aws4-request-signer-js
(c) 2009-2017 by Mike Wooten. All rights reserved.
code.paasdtools.oracle.com/postman/aws/aws4-request-signer-js/wiki/License
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
    root.aws4 = factory(CryptoJS, CryptoJS.SHA256, CryptoJS.HmacSHA256);
  }
}(this, function (CryptoJS) {
  'use strict';

  var RequestSigner = function (aws_params) {
    this.aws_params = aws_params;
    this.headers = {};
    this.hasher = CryptoJSHasher();
  };

  /**
  * <p>Signs parts of HTTP request using the AWS4-HMAC-SHA256 algorithm.</p>
  * @param {object} context Read-only object for request context
  * @param {object} request Read-only object for request to create signature for
  * @returns Signature to be assigned to Authorization HTTP request header.
  */
  RequestSigner.prototype.sign = function (context, request) {
    var headersToSign = [
      "host",
      "x-amz-content-sha256",
      "x-amz-date"
    ];

    var headerHash = buildHeaderHash(this, request);

    var credential = {
      kSecret : this.aws_params["AWS_SECRET_ACCESS_KEY"],
      kDate : this.headers["X_AMZ_DATE"],
      kRegion : this.aws_params["AWS_REGION"],
      kService : this.aws_params["AWS_SERVICE"]
    };

    var credentialScope = [credential.kDate.substr(0,8), credential.kRegion, credential.kService, "aws4_request"].join('/');

    var canonicalRequest = createCanonicalRequest(this, request, headersToSign, headerHash);
    var stringToSign = createStringToSign(this, credential, credentialScope, canonicalRequest);
    var signature = calculateSignature(this, credential, stringToSign);
    var signatureHeader = buildSignatureHeader(this, credentialScope, signature, headersToSign);

    if (this.aws_params["AWS4_DEBUG"]){
      this.aws_params["AWS4_CANONICAL_REQUEST"]= canonicalRequest;
      this.aws_params["AWS4_STRING_TO_SIGN"]= stringToSign;
    }

    return signatureHeader;
  };

//private:
  function buildHeaderHash(self, request){
    var verb = request.method.toLowerCase();

    var payload = (request.dataMode == "raw" ? request.data.toString() : '');

    self.headers = {
      DATE : new Date().toGMTString(),
      X_CONTENT_SHA256 : self.hasher.hash(payload),
      X_AMZ_DATE : amzDate(new Date(), false)
    };

    var headerHash = {
      host : request.url.host,
      'x-amz-content-sha256' : self.headers["X_CONTENT_SHA256"],
      'x-amz-date' : self.headers["X_AMZ_DATE"]
    };

    return headerHash;
  }

  function createCanonicalRequest(self, request, headersToSign, headerHash) {
    var canonicalRequest = request.method.toUpperCase() + '\n' +
      // Canonical URI:
      request.url.pathname.split('/').map(function(seg) {
        return encodeURIComponent(seg);
      }).join('/') + '\n' +
      // Canonical Query String:
      getCanonicalQueryStrings(request.url.searchParams) + '\n' +
      // Canonical Headers:
      Object.keys(headerHash).map(function (key) {
        return key.toLocaleLowerCase() + ':' + headerHash[key];
      }).join('\n') + '\n\n' +
      // Signed Headers:
      headersToSign.join(';') + '\n' +
      // Hashed Payload
      self.headers["X_CONTENT_SHA256"];

    return canonicalRequest;
  }

  function createStringToSign(self, credential, credentialScope, canonicalRequest) {
    var stringToSign = 'AWS4-HMAC-SHA256' + '\n' +
      credential.kDate + '\n' +
      credentialScope + '\n' +
      self.hasher.hash(canonicalRequest);
    return stringToSign;
  }

  function calculateSignature(self, credential, stringToSign) {
    var hmac = self.hasher.hmac;
    var signKey = hmac(
      hmac(
        hmac(
          hmac(
            'AWS4' + self.aws_params["AWS_SECRET_ACCESS_KEY"],
            credential.kDate.substr(0,8),
            {hexOutput: false}
          ),
          credential.kRegion,
          {hexOutput: false, textInput: false}
        ),
        credential.kService,
        {hexOutput: false, textInput: false}
      ),
      'aws4_request',
      {hexOutput: false, textInput: false}
    );
    return hmac(signKey, stringToSign, {textInput: false});
  }

  function buildSignatureHeader(self, credentialScope, signature, headersToSign) {
    return 'AWS4-HMAC-SHA256 ' +
      'Credential=' + self.aws_params["AWS_ACCESS_KEY_ID"] + '/' + credentialScope + ',' +
      'SignedHeaders=' + headersToSign.join(';') + ',' +
      'Signature=' + signature;
  }

  function getCanonicalQueryStrings(searchParams) {
    var queryStrings = '';
    if (searchParams.toString().length) {
      for (var key of searchParams.keys()) {
        queryStrings += encodeURIComponent(key) + '=' + encodeURIComponent(searchParams.get(key)) + '&';
      }
    } else {
      queryStrings = '&';
    }

    return queryStrings.slice(0, -1);
  }

  /**
  * Format the given `Date` as AWS compliant date string.
  * Time part gets omitted if second argument is set to `true`.
  * @param {object} date Date to convert to format acceptable by AMZ
  * @param {boolean} short Flag indicating to omit time part
  * @returns String representation of date in AMZ format
  */
  function amzDate(date, short) {
    var result = date.toISOString().replace(/[:\-]|\.\d{3}/g, '').substr(0, 17);
    if (short) {
      return result.substr(0, 8);
    }
    return result;
  }

  /**
  * Hash factory implementation using the SHA-256 hash algorithm of CryptoJS.
  * Requires at least the CryptoJS rollups: `sha256.js` and `hmac-sha256.js`.
  */
  function CryptoJSHasher() {
    return {
      /**
      * Hash the given input using SHA-256 algorithm.
      * The options can be used to control the in-/output of the hash operation.
      * @param {*} input Input data.
      * @param {object} options Options object:
      * `hexOutput` -- Output the hash with hex encoding (default: `true`).
      * `textInput` -- Interpret the input data as text (default: `true`).
      * @returns The generated hash
      */
      hash: function (input, options) {
        options = extend({hexOutput: true, textInput: true}, options);
        var hash = CryptoJS.SHA256(input);
        if (options.hexOutput) {
          return hash.toString(CryptoJS.enc.Hex);
        }
        return hash;
      },

      /**
      * Create the HMAC of the given input data with the given key using the SHA-256
      * hash algorithm.
      * The options can be used to control the in-/output of the hash operation.
      * @param {string} key Secret key.
      * @param {*} input Input data.
      * @param {object} options Options object:
      * `hexOutput` -- Output the hash with hex encoding (default: `true`).
      * `textInput` -- Interpret the input data as text (default: `true`).
      * @returns The generated HMAC.
      */
      hmac: function (key, input, options) {
        options = extend({hexOutput: true, textInput: true}, options);
        var hmac = CryptoJS.HmacSHA256(input, key, {asBytes: true});
        if (options.hexOutput) {
          return hmac.toString(CryptoJS.enc.Hex);
        }
        return hmac;
      }
    };
  }

  /**
  * Simple version of `extend` function, known from Angular and Backbone.
  * Merges second and subsequent arguments, into object given as first
  * argument. This is done recursively for all child objects, as well.
  */
  function extend(dest) {
    var objs = [].slice.call(arguments, 1);
    objs.forEach(function (obj) {
      if (!obj || typeof(obj) !== 'object') {
        return;
      }
      Object.keys(obj).forEach(function (key) {
        var src = obj[key];
        if (typeof(src) === 'undefined') {
          return;
        }
        if (src !== null && typeof(src) === 'object') {
          dest[key] = (Array.isArray(src) ? [] : {});
          extend(dest[key], src);
        } else {
          dest[key] = src;
        }
      });
    });

    return dest;
  }

  /**
  * Procedure that throws an error if specified object is undefined.
  * @param {object} Object to check
  * @param {string} Message to use in error, if obj is undefined
  */
  function assertRequired(obj, msg) {
    if (typeof(obj) === 'undefined' || !obj) {
      throw new Error(msg);
    }
  }

  /**
  * Creates UUID from current time
  * @returns String representation of a UUID
  */
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
