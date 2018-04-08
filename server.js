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
const pdfUtil = require('pdf-to-text');
const azure = require('azure');
const PORT = process.env.PORT || 1337;

let app = express();
app.use('/static', express.static(path.join(__dirname, 'public')))

if (!fs.existsSync(__dirname + '/uploads')) {
	fs.mkdirSync(__dirname + '/uploads');
}

// Read queue data and create queue if not already exists
let queueData = {}
if ( process.env.QUEUE_NAME === undefined || process.env.CONNECTION_STRING === undefined) {
    queueData = JSON.parse(fs.readFileSync(__dirname + '/queue.json', 'utf8', (err) => {
        console.log('[Error] Error while reading queue data');
    }));
} else {
	queueData = {
		"queuename": process.env.QUEUE_NAME,
		"connectionString": process.env.CONNECTION_STRING
	}
}


const serviceBusService = azure.createServiceBusService(queueData.connectionString);
serviceBusService.createQueueIfNotExists(queueData.queuename, function (error) {
	if (!error) {
		// Queue exists
		console.log('[Log] Queue exists!');
	}
});

// Create Server
let server = app.listen(PORT, () => {
	let host = server.address().address;
	let port = server.address().port;
	console.log("[API] [Start] Listening at http://%s:%s", host, port);
});

/*
 * Splits given text into chunks
 * @param text - The text to split
 * @return chunks - array of chunks
*/
let splitText = (text) => {
	let chunks = text.split('.');
	return chunks;
}

let pdfText = '';
let pdfPath = '';

let parsecb = (err, fields, files, res) => {
	let oldPath = files.file.path;
	let fileExt = files.file.name.split('.').pop();
	let fileName = oldPath.substr(oldPath.lastIndexOf('\\') + 1);
	let newPath = path.join(process.cwd(), '/uploads/', fileName + '.' + fileExt);
	pdfPath = newPath;
	fs.readFile(oldPath, (err, data) => {
		fs.writeFile(newPath, data, (err) => {
			fs.unlink(oldPath, (err) => {
				if (err) { res.status(500); res.json({ 'success': false }); }
				else {
					pdfUtil.pdfToText(newPath, function (err, text) {
						if (err) {
							console.log('[Error] PDF not exists or could not be parsed!');
						} else {
							pdfText = text;
							// console.log(pdfText);
						}
					});
					res.status(200); res.json({ 'success': true });
				}
			});
		});
	});
};

let uploadfn = (req, res) => {
	let form = new formidable.IncomingForm();
	let email = '';
	form.parse(req, (err, fields, files) => {
		if (fields.email != undefined && fields.email != '') {
			email = fields.email;
		} else {
			res.status(400); res.json({ 'success': false });
			return;
		}
		parsecb(err, fields, files, res);
	});

	setTimeout(function () {
		let chunks = pdfText.split('.');
		// console.log(chunks);
		for (let i = 0; i < chunks.length; i++) {
			if (!isUnwantedChunk(chunks[i])) { continue; }
			let message = {
				body: removeHyphenation(removeNewLines(chunks[i])),
				customProperties: {
					correlationid: uuidv4(),
					language: 'en', //TODO
					email: email,
					chunknr: i,
					lastOne: i != chunks.length ? false : true
				}
			};

			serviceBusService.sendQueueMessage(queueData.queuename, message, function (error) {
				if (!error) {
					// message sent
					console.log('[Log] Sending message ' + message.customProperties.chunknr);
				}
			});
		}
		// Delete PDF
		fs.unlinkSync(pdfPath);
	}, 20000);
};

let removeHyphenation = (chunk) => {
	return chunk.replace('-\r ', '');
};

let removeNewLines = (chunk) => {
	return chunk.replace('\n', ' ');
};

let isUnwantedChunk = (chunk) => {
	return chunk.match('.*[A-Za-z].*');
};

app.post('/upload', uploadfn);
