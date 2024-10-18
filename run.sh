clear
echo ~~~ NoteBot Telegram Bot ~~~

echo Starting...

cd "$(dirname "$0")"

while true
do
  node main.js
	echo Restarting Bot...
done
