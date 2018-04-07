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
const PORT = process.env.PORT || 1337;

let app = express();
app.use('/static', express.static(path.join(__dirname, 'public')))

let server = app.listen(PORT, () => {
  let host = server.address().address;
  let port = server.address().port;
  console.log("[API] [Start] Listening at http://%s:%s", host, port);
});

let parsecb = (err, fields, files, res) => {
	let oldPath = files.file.path;
	let fileExt = files.file.name.split('.').pop();
	let fileName = oldPath.substr(oldPath.lastIndexOf('\\') + 1);
	let newPath = path.join(process.cwd(), '/uploads/', fileName + '.' + fileExt);
	console.log(fields);
	fs.readFile(oldPath, (err, data) => {
		fs.writeFile(newPath, data, (err) => {
			fs.unlink(oldPath, (err) => {
				if (err) { res.status(500); res.json({'success': false}); }
				else { res.status(200); res.json({'success': true}); }
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
