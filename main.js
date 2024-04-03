const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

var config = JSON.parse(fs.readFileSync("./config.json", 'utf-8'))
const ownerId = config.ownerId;
const notesFolder = config.notesFolder;

const token = JSON.parse(fs.readFileSync("./token.json", 'utf-8'))
const bot = new TelegramBot(token.id, {polling: true});

bot.onText(/\/start/, (msg) => {

	if(msg.from.is_bot == true) return;
	if(msg.from.id != ownerId) return console.log(`Illegal access attempt: ${msg.from.id} '${msg.from.first_name}'`);

	bot.sendMessage(msg.chat.id, "Welcome to NoteBot!");
	
});

bot.onText(/\/list/, (msg) => {

	if(msg.from.is_bot == true) return;
	if(msg.from.id != ownerId) return console.log(`Illegal access attempt: ${msg.from.id} '${msg.from.first_name}'`);

	const fileList = fs.readdirSync(notesFolder).filter(file => file.endsWith('.txt'));
	const fileList_String = fileList.toString();
	const fileList_Array = fileList_String.split(",");

	let listMsg = " --- | Files | --- ";
	for (let i = 0; i < fileList_Array.length; i++) {
		listMsg += "\n" + fileList_Array[i];
	}

	bot.sendMessage(msg.chat.id, listMsg);

});

bot.onText(/\/add/, (msg) => {

	if(msg.from.is_bot == true) return;
	if(msg.from.id != ownerId) return console.log(`Illegal access attempt: ${msg.from.id} '${msg.from.first_name}'`);

	if (msg.text == undefined || msg.text == "" || !msg.text.includes(' ')) return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain arguments!');;
	const args = msg.text.substr(msg.text.indexOf(' ') + 1).split(' ');

	if (args[0] == undefined || args[0] == "") return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain filename!');
	if (args[1] == undefined || args[1] == "") return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain text after filename!');

	const saveLocation = notesFolder + args[0] + '.txt';
	const args_String = msg.text.substr(msg.text.indexOf(' ') + 1);
	const saveText = args_String.substr(args_String.indexOf(' ') + 1).trimStart().trimEnd() + '\n';

	if (saveText == " " || saveText == "" || !saveText) return;

	fs.appendFile(saveLocation, saveText, function (err) {
		if (err) throw err;
	});

	const note = `New note added to "${saveLocation.substr(saveLocation.lastIndexOf('/') + 1)}": ${saveText}`;
	bot.sendMessage(msg.chat.id, note);
	console.log(note);
	
	setDefaultNoteFilename(saveLocation.substr(saveLocation.lastIndexOf('/') + 1));

});

bot.onText(/\/download/, (msg) => {

	if(msg.from.is_bot == true) return;
	if(msg.from.id != ownerId) return console.log(`Illegal access attempt: ${msg.from.id} '${msg.from.first_name}'`);

	if (msg.text == undefined || msg.text == "" || !msg.text.includes(' ')) return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain arguments!');;
	const args = msg.text.substr(msg.text.indexOf(' ') + 1).split(' ');

	if (args[0] == undefined || args[0] == "") return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain filename!');

	const fileList = fs.readdirSync(notesFolder).filter(file => file.endsWith('.txt'));
	const fileList_String = fileList.toString();
	const fileList_Array = fileList_String.split(",");

	const filename = args[0] + ".txt";

	if (searchForFilename(filename, fileList_Array)){
		bot.sendDocument(msg.chat.id, notesFolder + filename);
	}
	else{
		bot.sendMessage(msg.chat.id, "Error: File could not be found!");
	}

});

bot.onText(/\/print/, (msg) => {

	if(msg.from.is_bot == true) return;
	if(msg.from.id != ownerId) return console.log(`Illegal access attempt: ${msg.from.id} '${msg.from.first_name}'`);

	if (msg.text == undefined || msg.text == "" || !msg.text.includes(' ')) return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain arguments!');;
	const args = msg.text.substr(msg.text.indexOf(' ') + 1).split(' ');

	if (args[0] == undefined || args[0] == "") return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain filename!');

	const fileList = fs.readdirSync(notesFolder).filter(file => file.endsWith('.txt'));
	const fileList_String = fileList.toString();
	const fileList_Array = fileList_String.split(",");

	const filename = args[0] + ".txt";

	if (searchForFilename(filename, fileList_Array)){
		try {
			const fileText = fs.readFileSync(notesFolder + filename, 'utf-8');

			if (fileText.length > 4094) {
				bot.sendMessage(msg.chat.id, "Error: File was too big to send!");

				return;
			}
			
			// Send message if file is not too big

			bot.sendMessage(msg.chat.id, fileText);
		}
		catch {
			bot.sendMessage(msg.chat.id, "Error: File could not be sent.") 
		}
	}
	else{
		bot.sendMessage(msg.chat.id, "Error: File could not be found!");
	}
});

bot.onText(/\/delete/, (msg) => {

	if(msg.from.is_bot == true) return;
	if(msg.from.id != ownerId) return console.log(`Illegal access attempt: ${msg.from.id} '${msg.from.first_name}'`);

	if (msg.text == undefined || msg.text == "" || !msg.text.includes(' ')) return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain arguments!');;
	const args = msg.text.substr(msg.text.indexOf(' ') + 1).split(' ');

	if (args[0] == undefined || args[0] == "") return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain filename!');

	const filename = args[0] + ".txt";
	if (filename == undefined || filename == "") return; 

	const fileList = fs.readdirSync(notesFolder).filter(file => file.endsWith('.txt'));
	const fileList_String = fileList.toString();
	const fileList_Array = fileList_String.split(",");

	if (!searchForFilename(filename, fileList_Array)) bot.sendMessage(msg.chat.id, "Error: File could not be found!");
	else{
		try {
			fs.unlinkSync(notesFolder + filename);

			const note = `File "${filename}" successfully deleted!`
			bot.sendMessage(msg.chat.id, note);
			console.log(note);

			return;
		}
		catch { 
			bot.sendMessage(msg.chat.id, "Error: Unable to delete file!");
			
			return;
		}
	}

});

bot.on('message', (msg) => {

	if(msg.from.is_bot == true) return;
	if(msg.from.id != ownerId) return console.log(`Illegal access attempt: ${msg.from.id} '${msg.from.first_name}'`);

	if (msg.text.startsWith('/')) return;
	if (msg.text == undefined || msg.text == "") return bot.sendMessage(msg.chat.id, 'Invalid command: Must contain arguments!');;

	if (msg.text.includes("reddit.com/r/")){
		let saveLocation = msg.text.substr(msg.text.indexOf("reddit.com/r/"));
		saveLocation = saveLocation.substr(13); // Trim "reddit.com/r/"
		saveLocation = saveLocation.substr(0, saveLocation.indexOf("/"));
		saveLocation = saveLocation.toLowerCase();

		if (saveLocation == "toothpasteboys") saveLocation = "ralsei";
		if (saveLocation == "furry_irl") saveLocation = "furry";
		if (saveLocation == "linkiscute") saveLocation = "link";

		let saveText = (msg.text.includes('?')) ? msg.text.substr(0, msg.text.indexOf('?')).trimStart().trimEnd() + '\n' : msg.text.trimStart().trimEnd() + '\n';

		fs.appendFile(`${notesFolder}${saveLocation}.txt`, saveText, function (err) {
			if (err) throw err;
		});

		const note = `New note added to "${saveLocation}.txt": ${saveText}`;
		bot.sendMessage(msg.chat.id, note);
		console.log(note);

		return;
	}

	// Continue when not Reddit link

	const saveLocation = config.defaultNoteFilename;
	const saveText = msg.text.trimStart().trimEnd() + '\n';

	fs.appendFile(`${notesFolder}${saveLocation}`, saveText, function (err) {
		if (err) throw err;
	});

	const note = `New note added to "${saveLocation}": ${saveText}`;
	bot.sendMessage(msg.chat.id, note);
	console.log(note);
});

function setDefaultNoteFilename(filename){
	if (filename.includes('/') || filename.includes('\\')) return;
	config.defaultNoteFilename = filename;

	const data = JSON.stringify(config);
	fs.writeFileSync('./config.json', data);

	//console.log(`Default note filename changed to "${filename}"`);
}

function searchForFilename(searchName, searchList){
	if (searchName == undefined || searchList == undefined || !Array.isArray(searchList) || searchList.length == 0) return false;

	for (var i = 0; i < searchList.length; i++) {
		if (searchName == searchList[i]) return true;
	}

	return false;
}

if (bot != undefined) console.log("NoteBot is online!\n");