# postman-oraclebmc-apis-js #
This is an opensource, GitHub project for using the Postman Chrome extension to invoke the [Oracle Bare Metal Cloud Services API](https://docs.us-phoenix-1.oraclecloud.com/api/#).

## How Does it Work? ##
**postman-oraclebmc-apis-js** is a JavaScript-based enhancement to the [Postman Sandbox](https://www.getpostman.com/docs/sandbox), which provides the [request signing](https://docs.us-phoenix-1.oraclecloud.com/Content/API/Concepts/signingrequests.htm) functionality needed when making Oracle Bare Metal Cloud Services API requests. Doing this requires a JavaScript cryptographic library that supports the RSA-SHA256 algorithm. After downloading and trying several opensource implementations, we decided on [jsrsasign](http://kjur.github.io/jsrsasign/).

Request signing involves the following steps:

1. Form the HTTPS request (SSL protocol TLS 1.2 is required). This capability is built into Postman itself.
2. Create the signing string, which is based on parts of the request. A [pre-request](https://www.getpostman.com/docs/pre_request_scripts) script gathers information from the Postman environment and passes it to a [RequestSigner](#request-signer) JavaScript object. 
3. Create the signature from the signing string, using your Oracle Bare Metal Cloud Services API private key and the RSA-SHA256 algorithm. The RequestSigner JavaScript object has a <code>sign</code> function that leverages the RSA-SHA256 algorithm capabilities in the aforementioned jsrsasign cryptographic JavaScript library, to handle this chore.
4. Use the value returned from the <code>sign</code> function, as the value for the <code>Authorization</code> HTTP request header.

### Postman Pre-Request Script ###
Postman currently provides everything needed to make Oracle Bare Metal Cloud Services API calls, except a mechanism for specifying custom authentication profiles like [http-signature](https://tools.ietf.org/html/draft-cavage-http-signatures-05). We use the Postman [pre-request scripting](https://www.getpostman.com/docs/pre_request_scripts) functionality as a bridge between Postman and the Postman Sandbox.<br/>

A Postman pre-request script is JavaScript code you write that has access to the HTTP/S request Postman sends, before it sends it. postman-oraclebmc-apis-js comes with a pre-request script for each of the HTTP method types, used in the Oracle Bare Metal Cloud Services API.

### RequestSigner ###
<a name="request-signer"></a>Request signing is implemented using a JavaScript object (**RequestSigner**) located in a small JavaScript file named <code>bmc-request-signer-{version}.js</code>:

![Alt text](images/chrome-dev-tools-postman.png?raw=true "")

A pre-request script creates a _RequestSigner_ object, passing in the stringified contents of a PEM file. Postman Sandbox doesn&#39;t support accessing local files so a Postman environment variable was used to store the contents of the PEM file, which needs to be a RSA PRIVATE KEY for an [API signing key](https://docs.us-phoenix-1.oraclecloud.com/Content/API/Concepts/apisigningkey.htm).<br/>

Afterwards, the pre-request script builds JavaScript objects from the Postman environment and passes them to a prototype <code>sign(context, request)</code> function, which is where the SHA256withRSA signing of HTTP request headers (and/or body) happens. The <code>sign(context, request)</code> function returns the value that needs to be assigned to the <code>Authorization</code> HTTP request header.<br/>

Finally, the pre-request script uses the RequestSigner object&#39;s <code>headers</code> instance variable, to set other HTTP request headers in the actual HTTPS request that Postman will send.

## Getting Started ##
The _postman-oraclebmc-apis-js_ Postman Sandbox enhancement is simple to setup and use. The download comes with everything you need to get started, but you still need to ensure you&#39;ve met the pre-requisites for working with the Oracle Bare Metal Cloud Services API.
### Pre-requisites ###
If you&#39;ve been using the Oracle Bare Metal Cloud Services API with another programming language, then you&#39;ve already met the pre-requisites.<br/>
The only pre-requisites for the _postman-oraclebmc-apis-js_ Postman Sandbox enhancement are generating the [API signing key](https://docs.us-phoenix-1.oraclecloud.com/Content/API/Concepts/apisigningkey.htm), and [obtaining the OCIDs for your Tenancy and User](https://docs.us-phoenix-1.oraclecloud.com/Content/API/Concepts/apisigningkey.htm#five).<br/>

### Download ###
Click [here](postman-oraclebmc-apis.zip) to download the most recent version of the _postman-oraclebmc-apis-js_ Postman Sandbox enhancement.<br/>

### Install ###
<a name="install"></a>As stated earlier, _postman-oraclebmc-apis-js_ is an enhancement to the Postman Sandbox. Installing it involves a few simple manually performed modifications to the Postman Sandbox directories and files, located on the computer where the Postman Chrome extension is installed:<br/>
1. If Postman is open, close it.
2. Type <code>chrome://version</code> in address field of Chrome browser, to determine the Profile Path to Chrome extensions.
3. Open a command terminal/window and change to the sub-directory of the Postman extension, which should be:
	<code>{Profile Path}/Extensions/fhbjgbiflinjbdggehcddcbncdddomop</code>
4. Change to sub-directory named after the version (i.e. 4.11.0_0) of Postman that&#39;s installed, and unzip the <code>postman-oraclebmc-apis.zip</code> file there.
5. Edit the <code>html/tester_sandbox.html</code> file, inserting the following &lt;script> elements immediately after the <code>&lt;script type="text/javascript" src="../js/libs/request-snippet-generator.js"&lt;/script></code> line:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<code>&lt;script type=&quot;text/javascript&quot; src=&quot;../js/libs/jsrsasign/jsrsasign-latest-all-min.js&quot;>&lt;/script></code><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<code>&lt;script type=&quot;text/javascript&quot; src=&quot;../js/libs/oraclebmc/bmc-request-signer-{version}.js&quot;>&lt;/script></code><br/>

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_NOTE: Don&#39;t forget to replace {version} with the applicable value, in the above line._

The Oracle Bare Metal Cloud Services API is actually multiple APIs (each containing multiple requests), which we have packaged as individual Postman v2 Collections. The collections and shared environment containing the variables used in the pre-request scripts, are in a single JSON file that can be found [here](postman/oraclebmc.postman_dump.json). Download and save it locally, then use Postman to import the saved JSON file:

![Alt text](images/postman-settings-1.png?raw=true "")
![Alt text](images/postman-settings-2.png?raw=true "")

The single JSON file you saved already has pre-request scripts for each request. If you need to add a request (or are interested in creating additional ones), you can download the raw pre-request scripts from [here](pre-request_scripts) and use them as a starting point.
### Use ###
One-time actions:
1. Open &quot;Manage Environment&quot; dialog box in Postman, then choose the _oraclebmc-api_ shared environment.
2. Set the value associated with the NAMESPACE_NAME, TENANCY, COMPARTMENT, PRIVATE_KEY_PEM, API_USER and API_FINGERPRINT environment variables, to match your needs.

	_NOTE: Assign value beneath TENANCY field in the Oracle Bare Metal Cloud Services UI, to the NAMESPACE_NAME environment variable. Postman doesn&#39;t currently support creating multiple line variable values, so you need to remove all the &#39;\n&#39; characters from the private key PEM file, and assign the resulting single line to the_PRIVATE_KEY_PEM environment variable. Don&#39;t enclose it in single or double-quotes._

3. Save the changes, then set oraclebmc-api as the environment to use when sending subsequent requests.

Per-request actions:
1. Expand collection containing folder with the request you want to send, then double-click on the request. 
2. Modify URL and payload of request to suit your needs.
3. The request already has the pre-request script for the appropriate HTTP method, but you may want to modify it to use environment variables you&#39;ve created. Care must be taken when doing that because variable names inside double curly braces used in a request payload, are not automatically expanded to a value with pre-request scripts. You must use the built-in <code>replace</code> function (of a JavaScript string) to expand the value yourself, **before** you invoke the RequestSigner object&#39;s <code>sign</code> function. See the [post-verb.js](pre-request_scripts/post-verb.js) file for an example of how to do that.
4. Click the &quot;Send&quot; button to send the request. Refer to the [API documentation](https://docs.us-phoenix-1.oraclecloud.com/api/#) for specifics on the response that&#39;s returned.

## Dependencies ##
The _postman-oraclebmc-apis-js_ Postman Sandbox enhancement depends on functionality found in the [jsrsasign](http://kjur.github.io/jsrsasign/) JavaScript cryptographic library. A version of it is included in the <code>postman-oraclebmc-apis.zip</code> file.

## Caveats ##
The steps you performed under the [Install](#install) section will be overwritten by automatic updates to the Postman Sandbox environment. You will need to either disable automatic Postman updates or re-perform the install steps for _postman-oraclebmc-apis-js_, when you suddenly get the following error from a pre-request script that was working just fine earlier:

![Alt text](images/request-signer-not-defined.png?raw=true "")

The total time it takes to perform the re-install steps is only around 1-2 minutes, so this may not be a major cause for concern.
## Limitations ##
Here are some of the known limitations for the postman-oraclebmc-apis-js Postman Sandbox enhancement.
### Postman <code>request.url</code> Not Modifiable Programmatically ###
Several Oracle Bare Metal Cloud Service API requests have query parameter values containing characters that must be URL encoded, **before** Postman invokes the pre-request script. One that comes to mind is the <code>availabilityDomain</code> query parameter, which will have a value like <code>AcEZ:PHX-AD-1</code> assigned to it. This needs to be changed to <code>AcEZ%3APHX%2DAD%2D1</code> in the Postman UI, because it cannot be changed programmatically in a pre-request script or code in the RequestSigner.
### Postman Environment Variables Cannot Have Multiple Lines ###
A PEM format file has multiple &#39;\n&#39; terminated lines. A stringified representation must have all of these &#39;\n&#39; characters removed before assigning it to a Postman environment variable.
### No Automatic Expansion of <code>{{variable}}</code> in Request Payload ###
When Postman encounters a double curly brace variable in raw body content, it normally replaces it with the current value of the variable. This is not the case with pre-request scripts, so it can be an issue with POST and PUT requests where the request payload actually gets signed.
 
To avoid problems, use the built-in <code>replace</code> function (of a JavaScript string) to programmatically expand the value of all double curly brace variables inside pre-request scripts, **before** you invoke the RequestSigner object&#39;s <code>sign</code> function.