# Remember credentials for future automatic runs
git config credential.helper store

git fetch
up_to_date=`git status | grep up-to-date`
pid=`pgrep raccoon-server`

if test -z "$up_to_date" ; then
	echo "Server out of date, updating..."
	git pull
fi

if test -z "$pid" || test -z "$up_to_date" ; then
	if test -n "$pid" ; then
		echo "Killing old server process"
		kill $pid
	fi

	echo "Updating package dependencies"
	npm install

	echo "Starting new server process"
	nodejs src/js/srv/main.js >> log.txt&
fi
