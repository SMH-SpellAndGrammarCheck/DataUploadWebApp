/*
 * A simple Web App for uploading PDFs and send them to another service for further processing.
 * ------------------
 * Author: SMH - Sandro Speth, Matthias Hermann, Heiko Geppert
 * Version: 1.0.0
 */

const express = require('express');
const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid/v4');
var querystring = require('querystring');
var pdfUtil = require('pdf-to-text');
const PORT = process.env.PORT || 1337;

let app = express();
app.use('/static', express.static(path.join(__dirname, 'public')))

let server = app.listen(PORT, () => {
  let host = server.address().address;
  let port = server.address().port;
  console.log("[API] [Start] Listening at http://%s:%s", host, port);
});

let splitText = (text) => {
	let chunks = text.split('.');
	return chunks;
}

let parsecb = (err, fields, files, res) => {
	let oldPath = files.file.path;
	let fileExt = files.file.name.split('.').pop();
	let fileName = oldPath.substr(oldPath.lastIndexOf('\\') + 1);
	let newPath = path.join(process.cwd(), '/uploads/', fileName + '.' + fileExt);
	let testPath = path.join(process.cwd(), '/uploads/', fileName + '.txt');
	console.log(fields);
	fs.readFile(oldPath, (err, data) => {
		fs.writeFile(newPath, data, (err) => {
			fs.unlink(oldPath, (err) => {
				if (err) { res.status(500); res.json({'success': false}); }
				else {
					let chunks = [];
					pdfUtil.pdfToText(newPath, function(err, text) {
						if (err) {
							console.log('[Error] PDF not exists or could not be parsed!');
						} else {
							chunks = splitText(text);
						}
					});

					console.log(chunks);
					/* const options = {
						hostname: '127.0.0.1',
						port: 5000,
						path: '/tasks',
						method: 'POST',
						headers: {
							'Content-Type': 'application/pdf',
						  	'correlationid': uuidv4(),
						  	'language': 'en', //TODO
							'email': fields.email
						}
					};
					  
					const req = http.request(options, (result) => {
						console.log(`STATUS: ${result.statusCode}`);
						console.log(`HEADERS: ${JSON.stringify(result.headers)}`);
						result.setEncoding('utf8');
						result.on('data', (chunk) => {
						  console.log(`BODY: ${chunk}`);
						});
						result.on('end', () => {
						  console.log('No more data in response.');
						});
					});

					req.on('error', (e) => {
						console.error(`problem with request: ${e.message}`);
					});

					// write data to request body
					req.write(data);
					req.end();  */

					res.status(200); res.json({'success': true}); 
				}
			});
		});
	});
};

let uploadfn = (req, res) => {
	var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
		parsecb(err, fields, files, res);
	});
};

app.post('/upload', uploadfn);
