// Made by exosZoldyck

const version = "1.1.0";

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

createDefaultFiles();

var config = JSON.parse(fs.readFileSync("./config.json", 'utf-8'))
const ownerId = config.ownerId;
const notesFolder = config.notesFolder;

const token = JSON.parse(fs.readFileSync("./token.json", 'utf-8'))
const bot = new TelegramBot(token.id, {polling: true});

let lastWriteLocation = undefined;

/*
Command descriptions: 
	start - Welcome message
	list - Print out a list of all existing files
	add - Write a new line to a file
	undo - Undoes the last write operation performed 
	info - Shows some basic info about the file
	download - Send a file for download
	print - Send a file in the form of text messages
	tail - Send the last line of a file in the form of a text message
	delete - Permanently delete a file
*/

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

	writeToFile(saveLocation, saveText, msg);

	lastWriteLocation = args[0] + '.txt';
	
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

bot.onText(/\/info/, (msg) => {
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
		const fileInfo = fs.statSync(notesFolder + filename);
		const fileText = fs.readFileSync(notesFolder + filename, 'utf-8');
		if (fileInfo == undefined) return bot.sendMessage(msg.chat.id, "Error: File info could not be read!");
		if (fileText == undefined) return bot.sendMessage(msg.chat.id, "Error: File text could not be read!");

		let sizeText = "";
		const size = fileInfo.size;
		if (size == undefined || isNaN(size) || size < 0) return bot.sendMessage(msg.chat.id, "Error: Invalid file size!");

		if (size < 1000) sizeText = `${size}B`;
		else if (size >= 1000) sizeText = `${size / (1000)}KB`;
		else if ((size / 1000) >= 1000) sizeText = `${size / (1000 * 1000)}MB`;
		else sizeText = `${size / (1000 * 1000 * 1000)}GB`;

		let fileText_array = fileText.split(/(\r\n|\n|\r)/gm);
		if (fileList_Array == undefined) bot.sendMessage(msg.chat.id, "Error: Invalid line count!");
		let fileText_length = fileText_array.length;

		console.log(fileText_array)

		for (let i = 0; i < fileText_array.length; i++){
			if (fileText_array[i] == "" || fileText_array[i] == "\n") fileText_length--;
		}

		const infoText = `${filename} --> ${fileText_length} lines, ${sizeText}`;
		bot.sendMessage(msg.chat.id, infoText);
	}
	else{
		return bot.sendMessage(msg.chat.id, "Error: File could not be found!");
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

bot.onText(/\/undo/, (msg) => {
	if(msg.from.is_bot == true) return;
	if(msg.from.id != ownerId) return console.log(`Illegal access attempt: ${msg.from.id} '${msg.from.first_name}'`);

	if (lastWriteLocation == undefined) return bot.sendMessage(msg.chat.id, 'Error: There is nothing to undo!');

	const filename = lastWriteLocation; 

	const fileList = fs.readdirSync(notesFolder).filter(file => file.endsWith('.txt'));
	const fileList_String = fileList.toString();
	const fileList_Array = fileList_String.split(",");

	if (!searchForFilename(filename, fileList_Array)) bot.sendMessage(msg.chat.id, "Error: Target file not found!");
	else{
		try {
			const fileContents = fs.readFileSync(notesFolder + filename).toString();
			let fileContents_Array = fileContents.split(/\r?\n/);

			fileContents_Array = fileContents_Array.slice(0, fileContents_Array.length - 2);
			fileContents_Array[fileContents_Array.length] = "";

			fileContents_String = fileContents_Array.join('\n');

			saveLocation = lastWriteLocation;

			try {
				fs.writeFileSync(`${notesFolder}${saveLocation}`, fileContents_String);
			} catch (err) {
				console.error(err);
				console.log(fileContents_String);
				return bot.sendMessage(msg.chat.id, "Error: CRITICAL WRITE ERROR!\nIntended output dumped to console!");
			}

			lastWriteLocation = undefined;

			const note = `Undone last write to "${filename}"!\n`;
			bot.sendMessage(msg.chat.id, note);
			console.log(note);

			return;
		}
		catch { 
			return bot.sendMessage(msg.chat.id, "Error: Unable to undo!");
		}
	}
});

bot.onText(/\/tail/, (msg) => {
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
			const fileText_array = fs.readFileSync(notesFolder + filename, 'utf-8').split(/(\r\n|\n|\r)/gm);
			for (let i = 0; i < fileText_array.length; i++){
				if (fileText_array[i] == "\n" || fileText_array[i] == "" || fileText_array[i].length === 0) fileText_array.splice(i, 1);
			}

			const fileTextTail = fileText_array[fileText_array.length - 2];
			if (fileTextTail.length > 4094) {
				bot.sendMessage(msg.chat.id, "Error: Tail was too big to send!");

				return;
			}
			
			// Send message if tail is not too big

			bot.sendMessage(msg.chat.id, fileTextTail);
		}
		catch {
			bot.sendMessage(msg.chat.id, "Error: File could not be sent.") 
		}
	}
	else{
		bot.sendMessage(msg.chat.id, "Error: File could not be found!");
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

		writeToFile(`${notesFolder}${saveLocation}.txt`, saveText, msg);

		lastWriteLocation = `${saveLocation}.txt`;

		return;
	}

	// Continue when not Reddit link

	const saveLocation = config.defaultNoteFilename;
	const saveText = msg.text.trimStart().trimEnd() + '\n';

	writeToFile(`${notesFolder}${saveLocation}`, saveText, msg);

	lastWriteLocation = saveLocation;
});

function createDefaultFiles(){
	if(!fs.existsSync('./config.json')){
		fs.writeFileSync('./config.json', `{"defaultNoteFilename":"notes.txt","ownerId":"<your Telegram ID goes here>","notesFolder":"./notes/"}`);
		console.log("WARNING: Owner Telegram ID not set in 'config.json'");
	}
	if(!fs.existsSync('./token.json')){
		fs.writeFileSync('./token.json', `{"id":"<your bot token goes here>"}`);
		console.log("WARNING: Bot token not set in 'token.json'");
	}
	if(!fs.existsSync('./notes')){
		fs.mkdirSync('./notes');
	}
}

function writeToFile(saveLocation, saveText, msg){
	try{
		fs.appendFileSync(saveLocation, saveText);
		/*
		fs.appendFile(`${notesFolder}${saveLocation}.txt`, saveText, function (err) {
			if (err) throw err;
		});
		*/

		// Send a write confirmation to user and console
		const saveLocation_note = (saveLocation.includes('/')) ? saveLocation.slice(saveLocation.lastIndexOf('/') + 1) : saveLocation;
		const note = `New note added to "${saveLocation_note}": ${saveText}`;
		bot.sendMessage(msg.chat.id, note);
		console.log(note);

		// Read the write location file and split its contents into an array
		let  text_array = fs.readFileSync(saveLocation, 'utf-8').split(/(\r\n|\n|\r)/gm);
		for (let i = 0; i < text_array.length; i++){
			if (text_array[i] == "\n" || text_array[i] == "" || text_array[i].length === 0) text_array.splice(i, 1);
		}

		// Check if file already contains an identical entry
		for (let i = 0; i < text_array.length - 2; i++){
			if (text_array[i] == "" || text_array[i] == "\n") continue;
			if (text_array[i] === saveText.trimEnd()){
				bot.sendMessage(msg.chat.id, `Warning: "${saveLocation_note}" already contains this entry!`);
				break;
			}
		}
	} catch(err) {
		console.error(err);
	}
}

function setDefaultNoteFilename(filename){
	if (filename.includes('/') || filename.includes('\\')) return;
	config.defaultNoteFilename = filename;

	const data = JSON.stringify(config);
	fs.writeFileSync('./config.json', data);

	// console.log(`Default note filename changed to "${filename}"`);
}

function searchForFilename(searchName, searchList){
	if (searchName == undefined || searchList == undefined || !Array.isArray(searchList) || searchList.length == 0) return false;

	for (var i = 0; i < searchList.length; i++) {
		if (searchName == searchList[i]) return true;
	}

	return false;
}

if (bot != undefined) console.log(`NoteBot v${version} is online!\n`);